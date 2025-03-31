document.querySelectorAll(".card").forEach((card) => {
  card.addEventListener("click", () => {
    window.location.href = "view-properties-rent.html";
  });
});
//price range
document.getElementById("price-range").addEventListener("input", function () {
  const value = this.value;
  if (value < 10000) {
    this.setCustomValidity("Price must be at least 10,000");
  } else if (value > 80000000) {
    this.setCustomValidity("Price cannot exceed 8,000,000");
  } else {
    this.setCustomValidity("");
  }
});

