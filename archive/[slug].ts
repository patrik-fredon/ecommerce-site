import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../../lib/dbConnect';
import BlogPost from '../../../../models/BlogPost';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	// Connect to database
	await dbConnect();

	const {
		query: { slug },
		method
	} = req;

	switch (method) {
		case 'GET':
			try {
				// Find blog post by slug
				const post = await BlogPost.findOne({ slug });
				if (!post) {
					return res.status(404).json({ error: 'Blog post not found' });
				}
				return res.status(200).json(post);
			} catch (error) {
				return res.status(500).json({ error: 'Server error' });
			}

		case 'PUT':
			try {
				// For updating blog post by slug
				const updatedPost = await BlogPost.findOneAndUpdate({ slug }, req.body, {
					new: true
				});
				if (!updatedPost) {
					return res.status(404).json({ error: 'Blog post not found' });
				}
				return res.status(200).json(updatedPost);
			} catch (error) {
				return res.status(500).json({ error: 'Server error' });
			}

		default:
			res.setHeader('Allow', ['GET', 'PUT']);
			return res.status(405).end(`Method ${method} Not Allowed`);
	}
}
