'use client';

import { motion } from 'framer-motion';
import { ExternalLink, ArrowUpRight } from 'lucide-react';

interface ResultCardProps {
  title: string;
  text: string;
  subreddit: string;
  author: string;
  upvotes: number;
  link: string;
  tags?: string[];
}

export default function ResultCard({
  title,
  text,
  subreddit,
  author,
  upvotes,
  link,
  tags
}: ResultCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow duration-200"
    >
      <div className="flex items-start justify-between mb-3">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          r/{subreddit}
        </span>
        <div className="flex items-center text-gray-500 text-sm">
          <ArrowUpRight className="w-4 h-4 mr-1" />
          {upvotes}
        </div>
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 leading-tight">
        {title}
      </h3>
      
      {text && (
        <p className="text-gray-600 text-sm mb-4 line-clamp-3 leading-relaxed">
          {text}
        </p>
      )}
      
      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {tags.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <span className="text-xs text-gray-500">
          by {author}
        </span>
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          View Post
          <ExternalLink className="w-3 h-3 ml-1" />
        </a>
      </div>
    </motion.div>
  );
}
