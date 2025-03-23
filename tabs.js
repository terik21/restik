document.addEventListener("DOMContentLoaded", function () {
    const tabs = document.querySelectorAll(".tab-button");
    const tabContents = document.querySelectorAll(".tab");

    tabs.forEach(tab => {
        tab.addEventListener("click", function () {
            const target = this.getAttribute("data-tab");
            
            tabContents.forEach(content => {
                content.classList.remove("active");
            });
            
            document.getElementById(target).classList.add("active");
        });
    });
});
