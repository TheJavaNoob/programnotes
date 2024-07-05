document.addEventListener('DOMContentLoaded', function() {
    initDropdown();
});

function initDropdown(){
    const dropdownTitles = document.querySelectorAll('.dropdown-title');
    dropdownTitles.forEach(function(dropdownTitle) {
            dropdownTitle.addEventListener('click', function() {
            const dropdown = this.parentElement;
            const icon = dropdown.querySelector('.dropdown-icon');
            const isOpen = dropdown.classList.contains('dropdown-active');
            
            if (isOpen) {
                icon.textContent = '+';
            } else {
                icon.textContent = '-';
            }
            dropdown.classList.toggle('dropdown-active');
        });
    });
}