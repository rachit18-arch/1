// password eye button
const passwordInput = document.getElementById('passwordInput');
const toggleIcon = document.getElementById('toggleIcon');

document.getElementById('passwordToggle').addEventListener('click', function () {
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.classList.remove('bi-eye');
        toggleIcon.classList.add('bi-eye-slash');
    } else {
        passwordInput.type = 'password';
        toggleIcon.classList.remove('bi-eye-slash');
        toggleIcon.classList.add('bi-eye');
    }
});


// list
function toggleList() {
    var list = document.getElementById("myList");
    list.classList.toggle("show");
}

//   sticky header
window.onscroll = function () { stickyHeader() };

var header = document.getElementById("header");
var sticky = header.offsetTop;

function stickyHeader() {
    if (window.pageYOffset > sticky) {
        header.classList.add("sticky");
    } else {
        header.classList.remove("sticky");
    }
}