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
        if (!r.ok) throw new Error("File not found");
        return r.json();
    }

    renderProfile(info) {
        this.nodes.profile.innerHTML = `
            <div class="banner" style="background-image: url('${info.banner}')"></div>
            <div class="profile-meta">
                <img src="${info.avatar}" class="pfp" loading="lazy">
                <button class="follow-btn">Follow</button>
                <div class="info-group">
                    <h1 style="font-size: 20px; margin: 10px 0 2px;">${info.name} <span style="color:var(--accent)">✔</span></h1>
                    <p style="color:var(--dim); margin:0;">@${this.user}</p>
                    <p class="post-body" style="margin: 12px 0;">${info.bio}</p>
                    <div style="color:var(--dim); font-size:14px;">📍 ${info.location} · 🗓️ ${info.joined}</div>
                </div>
            </div>
        `;
    }

    renderTimeline(posts) {
        this.nodes.feed.innerHTML = posts.map(post => `
            <article class="post-card">
                <div class="post-main">
                    <div class="post-meta"><strong>${this.user}</strong> · ${post.timestamp}</div>
                    <div class="post-body">${post.content}</div>
                    <div class="post-actions">
                        <button class="act-btn reply-btn" data-id="${post.id}">
                            <span>💬</span> ${post.stats.replies}
                        </button>
                        <button class="act-btn share-btn"><span>🔁</span> ${post.stats.shares}</button>
                        <button class="act-btn heart-btn"><span>❤️</span> ${post.stats.likes}</button>
                    </div>
                </div>
                <div class="replies-wrapper" id="replies-${post.id}" style="display: none;">
                    ${this.renderReplies(post.replies)}
                </div>
            </article>
        `).join('');
    }

    renderReplies(replies) {
        if (!replies || replies.length === 0) return `<p style="padding:10px; color:var(--dim)">No conversations yet.</p>`;
        return replies.map(r => `
            <div class="reply-item">
                <div style="font-weight:700; font-size:13px;">@${r.user} <span style="color:var(--dim); font-weight:400;">· ${r.time}</span></div>
                <div style="margin-top:4px;">${r.text}</div>
            </div>
        `).join('');
    }

    initInteractions() {
        this.nodes.feed.onclick = (e) => {
            const btn = e.target.closest('.act-btn');
            if (!btn) return;

            // Heart/Like Animation
            if (btn.classList.contains('heart-btn')) {
                btn.classList.toggle('active');
                return;
            }

            // Reply Toggle with state
            if (btn.classList.contains('reply-btn')) {
                const id = btn.dataset.id;
                const container = document.getElementById(`replies-${id}`);
                const isHidden = container.style.display === 'none';

                container.style.display = isHidden ? 'block' : 'none';
                btn.classList.toggle('active', isHidden);
            }
        };
    }
}

// Start Engine
document.addEventListener('DOMContentLoaded', () => new SocialOS());
window.onhashchange = () => location.reload();