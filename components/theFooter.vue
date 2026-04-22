<script setup>
const links = [{
    label: 'Главная',
    icon: 'i-heroicons-home',
    to: '/'
}, {
    label: 'Книги Gativus',
    icon: 'i-heroicons-book-open',
    to: '/courses'
}, {
    label: 'О проекте',
    icon: "i-heroicons-information-circle",
    to: "/about"
}];
</script>

<template>
    <footer class="gativus-footer">
        <div class="footer-content">
            <div class="footer-brand">
                <img src="/images/121px-Logo.jpg" alt="Gativus" class="footer-logo" />
                <div class="footer-brand-text">
                    <span class="footer-title">GATIVUS</span>
                    <span class="footer-tagline">GTOM · GNET · GATE</span>
                </div>
            </div>
            <p class="footer-description">
                От теории сознания к физическому устройству.<br>
                Официальная база знаний проекта Gativus.
            </p>
            <div class="footer-links">
                <a href="mailto:gativusmedia@outlook.com" class="footer-link">
                    <UIcon name="i-heroicons-envelope" class="footer-link-icon" />
                    gativusmedia@outlook.com
                </a>
            </div>
            <span class="footer-copy">© {{ new Date().getFullYear() }} Gativus Project</span>
        </div>
    </footer>
</template>

<style scoped>
.gativus-footer {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    padding: 24px 16px 32px;
    border-top: 1px solid #c8c8c8;
    background: #f9f9f9;
}

.dark .gativus-footer {
    background: #1a1a1a;
    border-top-color: #333;
}

.footer-nav {
    width: 100%;
    display: flex;
    justify-content: center;
}

.footer-divider {
    width: 100%;
    height: 1px;
    background: #e0e0e0;
}

.dark .footer-divider {
    background: #333;
}

.footer-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    text-align: center;
}

.footer-brand {
    display: flex;
    align-items: center;
    gap: 12px;
}

.footer-logo {
    height: 40px;
    width: auto;
    border-radius: 6px;
    filter: drop-shadow(0 0 2px rgba(186, 186, 186, 0.4));
}

.footer-brand-text {
    display: flex;
    flex-direction: column;
}

.footer-title {
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 3px;
    color: #333;
    line-height: 1;
}

.dark .footer-title {
    color: #e0e0e0;
}

.footer-tagline {
    font-size: 11px;
    letter-spacing: 2px;
    color: #888;
    text-transform: uppercase;
    margin-top: 3px;
}

.dark .footer-tagline {
    color: #777;
}

.footer-description {
    margin: 0;
    font-size: 14px;
    line-height: 1.6;
    color: #666;
}

.dark .footer-description {
    color: #999;
}

.footer-links {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    justify-content: center;
}

.footer-link {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #555;
    text-decoration: none;
    transition: color 0.2s ease;
}

.footer-link:hover {
    color: #333;
}

.dark .footer-link {
    color: #aaa;
}

.dark .footer-link:hover {
    color: #e0e0e0;
}

.footer-link-icon {
    width: 16px;
    height: 16px;
}

.footer-copy {
    font-size: 12px;
    color: #999;
    letter-spacing: 0.5px;
}

.dark .footer-copy {
    color: #666;
}
</style>