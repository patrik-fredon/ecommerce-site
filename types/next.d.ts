import { NextApiRequest } from 'next';
import { User } from '../utils/types';

declare module 'next' {
  interface NextApiRequest {
    user?: User;
  }
}
