class SocialOS {
    constructor() {
        this.user = window.location.hash.slice(1) || 'yalina';
        this.nodes = {
            feed: document.getElementById('feed-mount'),
            profile: document.getElementById('profile-mount')
        };
        this.postsCache = new Map(); // To store posts with their replies
        this.init();
    }

    async init() {
        try {
            const info = await this.fetchData(`data/user/${this.user}/info.json`);
            this.renderProfile(info);

            const year = info.years?.at(-1) || "2026";
            const month = info.year_map?.[year]?.at(-1) || "april";

            const postsData = await this.fetchData(`data/user/${this.user}/posts/${year}/${month}/posts.json`);

            // Load comments and prepare posts
            const postsWithComments = await this.loadCommentsForPosts(postsData.posts, year, month);

            this.postsCache.clear();
            postsWithComments.forEach(post => this.postsCache.set(post.id, post));

            this.renderTimeline(postsWithComments);
            this.initInteractions();
        } catch (err) {
            console.error("System Mess:", err);
            this.nodes.feed.innerHTML = `<p style="color: red; padding: 20px;">Failed to load posts. Please check the console.</p>`;
        }
    }

    async fetchData(url) {
        try {
            const r = await fetch(url);
            if (!r.ok) throw new Error(`HTTP ${r.status}: ${url}`);
            return await r.json();
        } catch (err) {
            console.error(`Fetch failed: ${url}`, err);
            throw err;
        }
    }

    // Improved comment loader with better path handling
    async loadCommentsForPosts(posts, year, month) {
        const basePath = `data/user/${this.user}/posts/${year}/${month}/`;

        return await Promise.all(posts.map(async (post) => {
            // Fix: Make sure each post has unique ID
            if (!post.id) {
                post.id = `post_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            }

            if (post.commentsFile) {
                try {
                    // Support both "comments/comment_1.json" and just "comment_1.json"
                    let commentUrl = post.commentsFile;
                    if (!commentUrl.startsWith('http') && !commentUrl.includes('/')) {
                        commentUrl = basePath + commentUrl;
                    } else if (commentUrl.startsWith('comments/')) {
                        commentUrl = basePath + commentUrl;
                    }

                    const commentsData = await this.fetchData(commentUrl);
                    post.replies = Array.isArray(commentsData.replies) ? commentsData.replies : [];
                } catch (err) {
                    console.warn(`⚠️ Could not load comments for ${post.id} from ${post.commentsFile}`, err);
                    post.replies = [];
                }
            } else {
                post.replies = [];
            }
            return post;
        }));
    }

    timeAgo(fullTimeStr) {
        if (!fullTimeStr) return "now";
        const cleaned = fullTimeStr.replace('•', '').trim();
        const date = new Date(cleaned);
        if (isNaN(date.getTime())) return "now";

        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return "now";
        if (diffMins < 60) return diffMins + "m";
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return diffHours + "h";
        return Math.floor(diffHours / 24) + "d";
    }

    renderProfile(info) {
        this.nodes.profile.innerHTML = `
            <div class="banner" style="background-image: url('${info.banner || 'default-banner.jpg'}')"></div>
            <div class="profile-meta">
                <img src="${info.avatar || 'default-avatar.jpg'}" class="pfp" alt="${info.name}" loading="lazy">
                <button class="follow-btn">Follow</button>
                <div class="info-group">
                    <h1>${info.name} ${info.verified ? '<span style="color:var(--accent)">✔</span>' : ''}</h1>
                    <p class="username">@${info.handle || this.user}</p>
                    <p class="post-body bio">${info.bio || ''}</p>
                    <div class="profile-details">
                        📍 ${info.location || ''} · 🗓️ ${info.joined || ''}
                    </div>
                </div>
            </div>
        `;
    }

    renderTimeline(posts) {
        if (!posts || posts.length === 0) {
            this.nodes.feed.innerHTML = `<p>No posts yet.</p>`;
            return;
        }

        this.nodes.feed.innerHTML = posts.map(post => `
            <article class="post-card" data-id="${post.id}">
                <div class="post-main">
                    <div class="post-meta">
                        <strong>${post.authorName || 'Yalina Zaidi'}</strong>
                        <span class="username">@${this.user}</span>
                        <span class="dot">·</span>
                        <span class="reply-time" title="${post.full_timestamp}">${this.timeAgo(post.full_timestamp)}</span>
                    </div>
                    <div class="post-body">${this.escapeHtml(post.content)}</div>

                    <div class="post-actions">
                        <button class="act-btn reply-btn" data-id="${post.id}">
                            💬 <span class="count">${post.stats?.replies || 0}</span>
                        </button>
                        <button class="act-btn share-btn">
                            🔁 <span class="count">${post.stats?.shares || 0}</span>
                        </button>
                        <button class="act-btn heart-btn">
                            ❤️ <span class="count">${post.stats?.likes || 0}</span>
                        </button>
                    </div>
                </div>

                <div class="replies-wrapper" id="replies-${post.id}" style="display: none;">
                    ${this.renderReplies(post.replies || [])}
                </div>
            </article>
        `).join('');
    }

    renderReplies(replies) {
        if (!replies || replies.length === 0) {
            return `<div class="no-replies">No replies yet. Be the first!</div>`;
        }

        return replies.map(reply => `
            <div class="reply-item">
                <div class="reply-header">
                    <strong>${this.escapeHtml(reply.name || '')}</strong>
                    <span class="username">@${reply.user || ''}</span>
                    <span class="dot">·</span>
                    <span class="reply-time" title="${reply.full_time || ''}">${this.timeAgo(reply.full_time)}</span>
                </div>
                ${reply.replying_to ? 
                    `<div class="replying-to">Replying to @${reply.replying_to}</div>` : ''}
                <div class="reply-text">${this.escapeHtml(reply.text || '')}</div>
            </div>
        `).join('');
    }

    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    initInteractions() {
        this.nodes.feed.addEventListener('click', (e) => {
            const btn = e.target.closest('.act-btn');
            if (!btn) return;

            // Like button
            if (btn.classList.contains('heart-btn')) {
                btn.classList.toggle('active');
                const countEl = btn.querySelector('.count');
                if (countEl) {
                    let count = parseInt(countEl.textContent) || 0;
                    countEl.textContent = btn.classList.contains('active') ? count + 1 : Math.max(0, count - 1);
                }
                return;
            }

            // Reply button - toggle comments
            if (btn.classList.contains('reply-btn')) {
                const postId = btn.dataset.id;
                const repliesContainer = document.getElementById(`replies-${postId}`);

                if (!repliesContainer) {
                    console.warn(`Replies container not found for post: ${postId}`);
                    return;
                }

                const isHidden = repliesContainer.style.display === 'none';
                repliesContainer.style.display = isHidden ? 'block' : 'none';
                btn.classList.toggle('active', isHidden);
            }
        });
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    new SocialOS();
});

window.onhashchange = () => location.reload();