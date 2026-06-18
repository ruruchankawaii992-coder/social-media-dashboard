import { useEffect, useState, useCallback } from 'react';
import type { Platform, Post } from '@shared/types';
import { PLATFORM_COLORS } from '@shared/constants';
import { ROUTES } from '@shared/api';
import { api, getAuthToken } from '../api/client';

const PLATFORMS: Platform[] = ['twitter', 'instagram', 'linkedin'];
const PLATFORM_LABELS: Record<Platform, string> = {
  twitter: 'Twitter',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/* ───────── Helpers ───────── */

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function parseScheduledAt(post: Post): Date | null {
  if (!post.scheduledAt) return null;
  const d = new Date(post.scheduledAt);
  return isNaN(d.getTime()) ? null : d;
}

function isCurrentMonth(date: Date, year: number, month: number): boolean {
  return date.getFullYear() === year && date.getMonth() === month;
}

/** Format post content for preview */
function preview(text: string, max = 50): string {
  return text.length > max ? text.slice(0, max) + '…' : text;
}

/* ───────── Types ───────── */

interface CalendarDay {
  date: Date;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  posts: Post[];
}

interface PostFormData {
  platform: Platform;
  content: string;
  scheduledAt: string;
}

const EMPTY_FORM: PostFormData = {
  platform: 'twitter',
  content: '',
  scheduledAt: '',
};

/* ───────── Component ───────── */

export default function SchedulePage() {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState<PostFormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  /* ───────── Fetch posts ───────── */

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res: any = await api.get<any>(ROUTES.POSTS.LIST);
      // Response shape: { data: Post[], total, page, limit }
      const list: Post[] = res.data ?? res ?? [];
      setPosts(Array.isArray(list) ? list : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  /* ───────── Calendar building ───────── */

  function buildCalendar(): CalendarDay[] {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startPad = firstDay.getDay(); // 0=Sun

    const cells: CalendarDay[] = [];

    // Padding days before month
    const prevLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startPad - 1; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - 1, prevLastDay - i);
      cells.push({
        date: d,
        day: d.getDate(),
        isCurrentMonth: false,
        isToday: sameDay(d, today),
        posts: [],
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(currentYear, currentMonth, i);
      const dayPosts = posts.filter((p) => {
        const sd = parseScheduledAt(p);
        return sd && sameDay(sd, d);
      });
      cells.push({
        date: d,
        day: i,
        isCurrentMonth: true,
        isToday: sameDay(d, today),
        posts: dayPosts,
      });
    }

    // Padding after month (fill to 42 cells = 6 rows)
    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(currentYear, currentMonth + 1, i);
      cells.push({
        date: d,
        day: d.getDate(),
        isCurrentMonth: false,
        isToday: sameDay(d, today),
        posts: [],
      });
    }

    return cells;
  }

  const calendar = buildCalendar();

  /* ───────── Navigation ───────── */

  function prevMonth() {
    if (currentMonth === 0) {
      setCurrentYear((y) => y - 1);
      setCurrentMonth(11);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (currentMonth === 11) {
      setCurrentYear((y) => y + 1);
      setCurrentMonth(0);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  }

  /* ───────── Modal ───────── */

  function openModal(date: Date) {
    setFormData({
      platform: 'twitter',
      content: '',
      scheduledAt: formatDateForInput(date),
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setFormData(EMPTY_FORM);
  }

  function formatDateForInput(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = '00';
    return `${y}-${m}-${d}T${h}:${min}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.content.trim()) return;
    setSubmitting(true);
    try {
      await api.post(ROUTES.POSTS.CREATE, {
        platform: formData.platform,
        content: formData.content.trim(),
        scheduledAt: formData.scheduledAt
          ? new Date(formData.scheduledAt).toISOString()
          : undefined,
      });
      closeModal();
      await fetchPosts();
    } catch (err: any) {
      alert(err.message || 'Failed to create post');
    } finally {
      setSubmitting(false);
    }
  }

  /* ───────── Delete ───────── */

  async function handleDelete(postId: string) {
    if (!window.confirm('Delete this scheduled post?')) return;
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(ROUTES.POSTS.DELETE(postId), {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Delete failed' }));
        throw new Error(err.error || 'Delete failed');
      }
      await fetchPosts();
    } catch (err: any) {
      alert(err.message || 'Failed to delete post');
    }
  }

  /* ───────── Extra logic ───────── */

  // Filter posts for the current month
  const monthPosts = posts.filter((p) => {
    const sd = parseScheduledAt(p);
    return sd && isCurrentMonth(sd, currentYear, currentMonth);
  }).sort((a, b) => {
    const da = parseScheduledAt(a)?.getTime() ?? 0;
    const db = parseScheduledAt(b)?.getTime() ?? 0;
    return da - db;
  });

  /* ───────── Render ───────── */

  return (
    <main style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
      <h1
        style={{
          color: '#e8e8f0',
          fontSize: 28,
          fontWeight: 700,
          marginBottom: 24,
        }}
      >
        Schedule
      </h1>

      {/* Loading */}
      {loading && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: 48,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              border: '3px solid #1a1a2e',
              borderTopColor: '#c084fc',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
            aria-label="Loading"
            role="status"
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div
          style={{
            backgroundColor: '#1a1a24',
            borderRadius: 12,
            border: '1px solid rgba(239,68,68,0.2)',
            padding: 32,
            textAlign: 'center',
            marginBottom: 16,
          }}
        >
          <p style={{ color: '#ef4444', fontSize: 15, marginBottom: 16 }}>
            {error}
          </p>
          <button
            onClick={fetchPosts}
            style={{
              backgroundColor: '#c084fc',
              color: '#0a0a0f',
              border: 'none',
              padding: '10px 24px',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Calendar */}
      {!loading && (
        <div
          style={{
            backgroundColor: '#16161e',
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.06)',
            overflow: 'hidden',
          }}
        >
          {/* Month/Year Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <button
              onClick={prevMonth}
              style={{
                background: 'none',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#e8e8f0',
                borderRadius: 8,
                padding: '6px 14px',
                cursor: 'pointer',
                fontSize: 14,
              }}
              aria-label="Previous month"
            >
              ← Prev
            </button>

            <span
              style={{ color: '#e8e8f0', fontWeight: 600, fontSize: 16 }}
            >
              {MONTHS[currentMonth]} {currentYear}
            </span>

            <button
              onClick={nextMonth}
              style={{
                background: 'none',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#e8e8f0',
                borderRadius: 8,
                padding: '6px 14px',
                cursor: 'pointer',
                fontSize: 14,
              }}
              aria-label="Next month"
            >
              Next →
            </button>
          </div>

          {/* Day-of-week header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {DAYS.map((d) => (
              <div
                key={d}
                style={{
                  padding: '10px 0',
                  textAlign: 'center',
                  color: '#8888a0',
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
            }}
          >
            {calendar.map((cell, idx) => (
              <button
                key={idx}
                onClick={() => openModal(cell.date)}
                style={{
                  background: 'none',
                  border: 'none',
                  borderRight: '1px solid rgba(255,255,255,0.03)',
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                  minHeight: 90,
                  padding: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  cursor: 'pointer',
                  position: 'relative',
                  opacity: cell.isCurrentMonth ? 1 : 0.25,
                  backgroundColor: cell.isToday
                    ? 'rgba(192, 132, 252, 0.08)'
                    : 'transparent',
                  transition: 'background-color 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (!cell.isToday) {
                    e.currentTarget.style.backgroundColor =
                      'rgba(255,255,255,0.03)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!cell.isToday) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
                aria-label={`${cell.date.toDateString()}${
                  cell.posts.length > 0
                    ? ` — ${cell.posts.length} post(s)`
                    : ''
                }`}
              >
                <span
                  style={{
                    color: cell.isToday ? '#c084fc' : '#8888a0',
                    fontSize: 13,
                    fontWeight: cell.isToday ? 700 : 400,
                    width: 26,
                    height: 26,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    backgroundColor: cell.isToday
                      ? 'rgba(192, 132, 252, 0.2)'
                      : 'transparent',
                  }}
                >
                  {cell.day}
                </span>

                {/* Post badges */}
                {cell.posts.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 2,
                      justifyContent: 'center',
                      marginTop: 'auto',
                    }}
                  >
                    {cell.posts.slice(0, 3).map((p) => (
                      <span
                        key={p.id}
                        title={p.content}
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor:
                            PLATFORM_COLORS[p.platform] || '#8888a0',
                          display: 'inline-block',
                          flexShrink: 0,
                        }}
                      />
                    ))}
                    {cell.posts.length > 3 && (
                      <span
                        style={{
                          color: '#8888a0',
                          fontSize: 9,
                          lineHeight: '8px',
                        }}
                      >
                        +{cell.posts.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Post List */}
      {!loading && (
        <div
          style={{
            marginTop: 24,
            backgroundColor: '#16161e',
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.06)',
            padding: '20px',
          }}
        >
          <h2
            style={{
              color: '#e8e8f0',
              fontSize: 16,
              fontWeight: 600,
              marginBottom: 16,
            }}
          >
            Posts for {MONTHS[currentMonth]} {currentYear}
          </h2>

          {monthPosts.length === 0 ? (
            <p style={{ color: '#8888a0', fontSize: 14 }}>
              No posts scheduled for this month. Click a day to create one.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {monthPosts.map((post) => {
                const sd = parseScheduledAt(post);
                const color = PLATFORM_COLORS[post.platform];
                return (
                  <div
                    key={post.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 16px',
                      backgroundColor: 'rgba(255,255,255,0.02)',
                      borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.04)',
                    }}
                  >
                    {/* Platform badge */}
                    <span
                      style={{
                        backgroundColor: color,
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 4,
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      {PLATFORM_LABELS[post.platform]}
                    </span>

                    {/* Content preview */}
                    <span
                      style={{
                        color: '#d0d0e0',
                        fontSize: 13,
                        flex: 1,
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={post.content}
                    >
                      {preview(post.content)}
                    </span>

                    {/* Date/time */}
                    {sd && (
                      <span
                        style={{
                          color: '#8888a0',
                          fontSize: 12,
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        {sd.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        {sd.toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}

                    {/* Status */}
                    <span
                      style={{
                        fontSize: 11,
                        color:
                          post.status === 'published'
                            ? '#22c55e'
                            : post.status === 'scheduled'
                              ? '#fbbf24'
                              : '#8888a0',
                        textTransform: 'capitalize',
                        fontWeight: 500,
                        flexShrink: 0,
                      }}
                    >
                      {post.status}
                    </span>

                    {/* Delete */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(post.id);
                      }}
                      style={{
                        background: 'none',
                        border: '1px solid rgba(239,68,68,0.3)',
                        color: '#ef4444',
                        borderRadius: 6,
                        padding: '4px 10px',
                        fontSize: 12,
                        cursor: 'pointer',
                        flexShrink: 0,
                        transition: 'background-color 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor =
                          'rgba(239,68,68,0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      aria-label={`Delete post on ${post.platform}`}
                    >
                      Delete
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ───── Modal overlay ───── */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Schedule a post"
        >
          <div
            style={{
              backgroundColor: '#1a1a24',
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.08)',
              padding: '28px',
              width: '100%',
              maxWidth: 480,
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20,
              }}
            >
              <h2
                style={{
                  color: '#e8e8f0',
                  fontSize: 18,
                  fontWeight: 600,
                }}
              >
                Schedule a Post
              </h2>
              <button
                onClick={closeModal}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#8888a0',
                  fontSize: 20,
                  cursor: 'pointer',
                  padding: 4,
                }}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Platform */}
              <div style={{ marginBottom: 16 }}>
                <label
                  htmlFor="post-platform"
                  style={{
                    display: 'block',
                    color: '#8888a0',
                    fontSize: 13,
                    marginBottom: 6,
                  }}
                >
                  Platform
                </label>
                <select
                  id="post-platform"
                  value={formData.platform}
                  onChange={(e) =>
                    setFormData((f) => ({
                      ...f,
                      platform: e.target.value as Platform,
                    }))
                  }
                  style={{
                    width: '100%',
                    backgroundColor: '#16161e',
                    color: '#e8e8f0',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    padding: '10px 14px',
                    fontSize: 14,
                    outline: 'none',
                  }}
                >
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {PLATFORM_LABELS[p]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Content */}
              <div style={{ marginBottom: 16 }}>
                <label
                  htmlFor="post-content"
                  style={{
                    display: 'block',
                    color: '#8888a0',
                    fontSize: 13,
                    marginBottom: 6,
                  }}
                >
                  Content
                </label>
                <textarea
                  id="post-content"
                  value={formData.content}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, content: e.target.value }))
                  }
                  rows={4}
                  placeholder="What would you like to post?"
                  style={{
                    width: '100%',
                    backgroundColor: '#16161e',
                    color: '#e8e8f0',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    padding: '10px 14px',
                    fontSize: 14,
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Date/time */}
              <div style={{ marginBottom: 20 }}>
                <label
                  htmlFor="post-datetime"
                  style={{
                    display: 'block',
                    color: '#8888a0',
                    fontSize: 13,
                    marginBottom: 6,
                  }}
                >
                  Schedule Date &amp; Time
                </label>
                <input
                  id="post-datetime"
                  type="datetime-local"
                  value={formData.scheduledAt}
                  onChange={(e) =>
                    setFormData((f) => ({
                      ...f,
                      scheduledAt: e.target.value,
                    }))
                  }
                  style={{
                    width: '100%',
                    backgroundColor: '#16161e',
                    color: '#e8e8f0',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    padding: '10px 14px',
                    fontSize: 14,
                    outline: 'none',
                    colorScheme: 'dark',
                  }}
                />
              </div>

              {/* Buttons */}
              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  justifyContent: 'flex-end',
                }}
              >
                <button
                  type="button"
                  onClick={closeModal}
                  style={{
                    background: 'none',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#8888a0',
                    padding: '10px 20px',
                    borderRadius: 8,
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !formData.content.trim()}
                  style={{
                    backgroundColor: '#c084fc',
                    color: '#0a0a0f',
                    border: 'none',
                    padding: '10px 24px',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.6 : 1,
                  }}
                >
                  {submitting ? 'Saving…' : 'Schedule Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
