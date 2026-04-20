class SocialOS {
    constructor() {
        this.user = window.location.hash.slice(1) || 'yalina';
        this.nodes = {
            feed: document.getElementById('feed-mount'),
            profile: document.getElementById('profile-mount')
        };
        this.init();
    }

    async init() {
        try {
            const info = await this.fetchData(`data/user/${this.user}/info.json`);
            this.renderProfile(info);

            const year = info.years.at(-1);
            const month = info.year_map[year].at(-1);
            const content = await this.fetchData(`data/user/${this.user}/posts/${year}/${month}/posts.json`);

            this.renderTimeline(content.posts);
            this.initInteractions();
        } catch (err) {
            console.error("System Mess:", err);
        }
    }

    async fetchData(url) {
        const r = await fetch(url);
        if (!r.ok) throw new Error(`Failed to load: ${url}`);
        return r.json();
    }

    renderProfile(info) {
        this.nodes.profile.innerHTML = `
            <div class="banner" style="background-image: url('${info.banner}')"></div>
            <div class="profile-meta">
                <img src="${info.avatar}" class="pfp" alt="${info.name}" loading="lazy">
                <button class="follow-btn">Follow</button>
                
                <div class="info-group">
                    <h1>${info.name} <span style="color:var(--accent)">✔</span></h1>
                    <p class="username">@${this.user}</p>
                    <p class="post-body bio">${info.bio}</p>
                    <div class="profile-details">
                        📍 ${info.location} · 🗓️ ${info.joined}
                    </div>
                </div>
            </div>
        `;
    }

    renderTimeline(posts) {
        this.nodes.feed.innerHTML = posts.map(post => `
            <article class="post-card" data-id="${post.id}">
                <div class="post-main">
                    <div class="post-meta">
                        <strong>${this.user}</strong>
                        <span class="dot">·</span>
                        <span>${post.timestamp}</span>
                    </div>
                    <div class="post-body">${post.content}</div>

                    <div class="post-actions">
                        <button class="act-btn reply-btn" data-id="${post.id}">
                            💬 <span class="count">${post.stats.replies}</span>
                        </button>
                        <button class="act-btn share-btn">
                            🔁 <span class="count">${post.stats.shares}</span>
                        </button>
                        <button class="act-btn heart-btn">
                            ❤️ <span class="count">${post.stats.likes}</span>
                        </button>
                    </div>
                </div>

                <!-- Replies Section -->
                <div class="replies-wrapper" id="replies-${post.id}" style="display: none;">
                    ${this.renderReplies(post.replies || [])}
                </div>
            </article>
        `).join('');
    }

    renderReplies(replies) {
        if (!replies || replies.length === 0) {
            return `<div class="no-replies">No replies yet. Be the first to reply!</div>`;
        }

        return replies.map(reply => `
            <div class="reply-item">
                <div class="reply-header">
                    <strong>@${reply.user}</strong>
                    <span class="reply-time">· ${reply.time}</span>
                </div>
                <div class="reply-text">${reply.text}</div>
            </div>
        `).join('');
    }

    initInteractions() {
        this.nodes.feed.addEventListener('click', (e) => {
            const btn = e.target.closest('.act-btn');
            if (!btn) return;

            // Like button with heart animation
            if (btn.classList.contains('heart-btn')) {
                btn.classList.toggle('active');
                const countEl = btn.querySelector('.count');
                if (countEl) {
                    let count = parseInt(countEl.textContent) || 0;
                    countEl.textContent = btn.classList.contains('active') ? count + 1 : count - 1;
                }
                return;
            }

            // Toggle replies
            if (btn.classList.contains('reply-btn')) {
                const postId = btn.dataset.id;
                const repliesContainer = document.getElementById(`replies-${postId}`);
                if (!repliesContainer) return;

                const isHidden = repliesContainer.style.display === 'none';
                repliesContainer.style.display = isHidden ? 'block' : 'none';
                
                // Toggle active state on reply button
                btn.classList.toggle('active', isHidden);
            }
        });
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new SocialOS();
});

window.onhashchange = () => location.reload();