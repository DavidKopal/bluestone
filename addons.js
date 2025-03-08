let addons = []
if (localStorage.getItem('addons')) {
    addons = JSON.parse(localStorage.getItem('addons'))
}

function install() {
    let addon = document.getElementById('install').value
    if (!addons.includes(addon)) {
        addons.push(addon)
    }

    localStorage.setItem('addons',JSON.stringify(addons))
}