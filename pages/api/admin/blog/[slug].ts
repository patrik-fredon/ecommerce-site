import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '../../../../middleware/auth';
import dbConnect from '../../../../lib/dbConnect';
import BlogPost from '../../../../models/BlogPost';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const {
    query: { slug },
    method,
  } = req;

  await dbConnect();

  switch (method) {
    case 'GET':
      try {
        const post = await BlogPost.findOne({ slug });
        if (!post) {
          return res.status(404).json({ message: 'Blog post not found' });
        }
        res.status(200).json(post);
      } catch (error) {
        res.status(500).json({ message: 'Error fetching blog post' });
      }
      break;

    case 'PUT':
      try {
        const post = await BlogPost.findOneAndUpdate(
          { slug },
          req.body,
          {
            new: true,
            runValidators: true,
          }
        );
        if (!post) {
          return res.status(404).json({ message: 'Blog post not found' });
        }
        res.status(200).json(post);
      } catch (error) {
        const err = error as Error;
        if ((err as any).code === 11000) {
          res.status(400).json({ message: 'A post with this slug already exists' });
        } else {
          res.status(500).json({ message: 'Error updating blog post' });
        }
      }
      break;

    case 'DELETE':
      try {
        const deletedPost = await BlogPost.findOneAndDelete({ slug });
        if (!deletedPost) {
          return res.status(404).json({ message: 'Blog post not found' });
        }
        res.status(200).json({ message: 'Blog post deleted successfully' });
      } catch (error) {
        res.status(500).json({ message: 'Error deleting blog post' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}

export default withAuth(handler);
