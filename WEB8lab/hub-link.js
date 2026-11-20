(function () {
  function addHubLink() {
    const header = document.querySelector('header');
    if (!header || header.querySelector('.all-labs-link')) return;
    const link = document.createElement('a');
    link.className = 'all-labs-link';
    link.href = '../index.html';
    link.textContent = '← Все лабораторные';
    link.style.cssText = 'display:inline-flex;align-items:center;margin:10px 0 0 20px;padding:7px 12px;border:1px solid #e2d6cc;border-radius:20px;color:#b65322;text-decoration:none;font-size:12px;font-weight:700;background:#fff;';
    header.appendChild(link);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addHubLink);
  else addHubLink();
})();
