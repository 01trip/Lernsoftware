import PocketBase from 'pocketbase';

// Connect to local PocketBase
export const pb = new PocketBase(import.meta.env.VITE_PB_URL || 'http://127.0.0.1:8090');

// Disable auto-cancellation to prevent issues with strict mode double-renders in React
pb.autoCancellation(false);
