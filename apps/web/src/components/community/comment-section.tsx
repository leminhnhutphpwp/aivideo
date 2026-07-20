'use client';

import React, { useState, useEffect } from 'react';
import { MessageCircle, Send, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { laravel } from '@/lib/api/client';
import { Comment } from '@/lib/api/community-types';
import { CreatorLevelBadge } from './creator-level-badge';
import { useToastStore } from '@/stores/toast-store';
import { useAuthStore } from '@/stores/auth-store';

interface CommentSectionProps {
  assetUuid: string;
  isOpen: boolean;
}

export function CommentSection({ assetUuid, isOpen }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalComments, setTotalComments] = useState(0);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const addToast = useToastStore(s => s.addToast);
  const currentUser = useAuthStore(s => s.user);

  useEffect(() => {
    if (isOpen) {
      loadComments(true);
    }
  }, [isOpen, assetUuid]);

  const loadComments = async (reset = false) => {
    setIsFetching(true);
    try {
      const offset = reset ? 0 : comments.length;
      const result = await laravel.communityComments(assetUuid, 20, offset);
      if (reset) {
        setComments(result.data);
      } else {
        setComments(prev => [...prev, ...result.data]);
      }
      setHasMore(result.has_more);
      setTotalComments(result.total);
    } catch (error) {
      console.error('Failed to load comments:', error);
      addToast('Không thể tải bình luận. Vui lòng thử lại sau.', 'error');
    } finally {
      setIsFetching(false);
    }
  };

  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    setIsLoading(true);
    try {
      await laravel.communityAddComment(assetUuid, newComment, replyTo ?? undefined);
      setNewComment('');
      setReplyTo(null);
      await loadComments(true);
    } catch (error: any) {
      console.error('Failed to add comment:', error);
      const msg = error?.message || 'Không thể thêm bình luận. Vui lòng thử lại sau.';
      addToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (commentId: number) => {
    setDeleteConfirmId(commentId);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await laravel.communityDeleteComment(deleteConfirmId);
      setDeleteConfirmId(null);
      await loadComments(true);
      addToast('Đã xóa bình luận.', 'success');
    } catch (error) {
      console.error('Failed to delete comment:', error);
      addToast('Không thể xóa bình luận. Vui lòng thử lại sau.', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="border-t border-white/12 pt-4 pb-2">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle className="h-4 w-4 text-[#FF5A1F]" />
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Bình luận ({totalComments})
        </span>
      </div>

      {/* Comment input */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={replyTo ? "Viết phản hồi..." : "Viết bình luận..."}
          className="flex-1 bg-white/[0.03] border border-white/12 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#FF5A1F]/30"
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
        <button
          onClick={handleSubmit}
          disabled={isLoading || !newComment.trim()}
          className="h-10 w-10 rounded-xl bg-[#FF5A1F] text-white flex items-center justify-center hover:brightness-110 disabled:opacity-50 cursor-pointer"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

      {/* Delete confirmation dialog */}
      {deleteConfirmId && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <p className="text-xs text-red-400 mb-2">Bạn có chắc muốn xóa bình luận này?</p>
          <div className="flex gap-2">
            <button
              onClick={() => setDeleteConfirmId(null)}
              className="px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-[10px] font-bold text-slate-400 hover:text-white uppercase tracking-wider cursor-pointer transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={confirmDelete}
              className="px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-[10px] font-bold text-red-400 hover:bg-red-500/30 uppercase tracking-wider cursor-pointer transition-colors"
            >
              Xóa
            </button>
          </div>
        </div>
      )}

      {/* Comments list */}
      <div className="space-y-4 max-h-[300px] overflow-y-auto">
        {isFetching && comments.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-8 text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-[#FF5A1F]" />
            <span className="text-xs">Đang tải bình luận...</span>
          </div>
        ) : comments.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            Chưa có bình luận nào. Hãy là người đầu tiên bình luận!
          </div>
        ) : (
          <>
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onReply={setReplyTo}
                onDelete={handleDelete}
                currentUserUuid={currentUser?.uuid}
              />
            ))}

            {hasMore && (
              <button
                onClick={() => loadComments(false)}
                disabled={isFetching}
                className="w-full py-2 text-xs font-bold text-slate-500 hover:text-[#FF5A1F] uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isFetching ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Đang tải...
                  </>
                ) : (
                  'Xem thêm bình luận...'
                )}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function CommentItem({ comment, onReply, onDelete, currentUserUuid }: {
  comment: Comment;
  onReply: (id: number) => void;
  onDelete: (id: number) => void;
  currentUserUuid?: string;
}) {
  const isOwnComment = currentUserUuid === comment.user.uuid;

  return (
    <div className="flex gap-3">
      <img
        src={comment.user.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&auto=format&fit=crop'}
        alt={comment.user.username}
        className="h-8 w-8 rounded-full object-cover border border-white/10 shrink-0"
      />
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-white">@{comment.user.username}</span>
          <CreatorLevelBadge level={comment.user.reputation_level as any} className="text-[8px] px-1.5 py-0" />
          <span className="text-[10px] text-slate-500">
            {new Date(comment.created_at).toLocaleDateString('vi-VN')}
          </span>
        </div>
        <p className="text-sm text-slate-300 mb-2">{comment.content}</p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onReply(comment.id)}
            className="text-[10px] text-slate-500 hover:text-[#FF5A1F] uppercase tracking-wider cursor-pointer transition-colors"
          >
            Phản hồi
          </button>
          {isOwnComment && (
            <button
              onClick={() => onDelete(comment.id)}
              className="text-[10px] text-slate-500 hover:text-red-400 uppercase tracking-wider cursor-pointer transition-colors"
            >
              Xóa
            </button>
          )}
        </div>

        {/* Nested replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3 pl-4 border-l border-white/12 space-y-3">
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                onReply={onReply}
                onDelete={onDelete}
                currentUserUuid={currentUserUuid}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
