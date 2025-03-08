function gotop(page) {
    let a = document.createElement('a')
    a.textContent = "CLICK ON THIS IF YOU HAVENT BEEN SENT TO THE NEXT PAGE"
    a.href = page
    document.body.appendChild(a)
    a.click()
}