document.addEventListener('DOMContentLoaded', function() {
    // Get sidebar element
    const sidebar = document.querySelector('.sidebar');
    
    // Get toggle button
    const toggleBtn = document.querySelector('.menu-toggle');
    
    // Get all dropdown arrows
    const arrows = document.querySelectorAll('.arrow');
    
    // Get all links with submenus
    const linkWithSubMenu = document.querySelectorAll('.nav-links li .icon-link');
    
    // Toggle sidebar
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            sidebar.classList.toggle('close');
            
            // Adjust main content area
            const homeSection = document.querySelector('.home-section');
            if (homeSection) {
                if (sidebar.classList.contains('close')) {
                    homeSection.style.left = '78px';
                    homeSection.style.width = 'calc(100% - 78px)';
                } else {
                    homeSection.style.left = '250px';
                    homeSection.style.width = 'calc(100% - 250px)';
                }
            }
        });
    }
    
    // Toggle dropdown menus when clicking on arrows
    arrows.forEach(arrow => {
        arrow.addEventListener('click', function(e) {
            e.preventDefault();
            const arrowParent = this.parentElement.parentElement;
            arrowParent.classList.toggle('active');
        });
    });
    
    // Toggle dropdown menus when clicking on links with submenus
    linkWithSubMenu.forEach(link => {
        link.addEventListener('click', function(e) {
            if (e.target.tagName !== 'I' || !e.target.classList.contains('arrow')) {
                e.preventDefault();
                const parent = this.parentElement;
                parent.classList.toggle('active');
            }
        });
    });
    
    // Auto-expand the active dropdown menu
    const activeDropdown = document.querySelector('.nav-links li.active');
    if (activeDropdown) {
        activeDropdown.classList.add('active');
    }
    
    // Check if sidebar should be closed on mobile
    function checkWidth() {
        if (window.innerWidth <= 768) {
            sidebar.classList.add('close');
            
            // Adjust main content area for mobile
            const homeSection = document.querySelector('.home-section');
            if (homeSection) {
                homeSection.style.left = '78px';
                homeSection.style.width = 'calc(100% - 78px)';
            }
        } else {
            sidebar.classList.remove('close');
            
            // Adjust main content area for desktop
            const homeSection = document.querySelector('.home-section');
            if (homeSection) {
                homeSection.style.left = '250px';
                homeSection.style.width = 'calc(100% - 250px)';
            }
        }
    }
    
    // Initial check
    checkWidth();
    
    // Listen for window resize
    window.addEventListener('resize', checkWidth);
});
