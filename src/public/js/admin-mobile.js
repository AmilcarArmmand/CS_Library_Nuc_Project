function toggleAdminSidebar() {
  document.body.classList.toggle('admin-nav-open');
}

function closeAdminSidebar() {
  document.body.classList.remove('admin-nav-open');
}

window.addEventListener('resize', function() {
  if (window.innerWidth > 768) {
    closeAdminSidebar();
  }
});
