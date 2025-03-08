let addons = []
if (localStorage.getItem('addons')) {
    addons = JSON.parse(localStorage.getItem('addons'))
}

addons.forEach(addon => {
    addAddon(addon)
})

function addAddon(addon) {
    let p = document.createElement('p')
    p.textContent = addon
    p.className = 'link'
    p.onclick = () => {
        const index = addons.indexOf(addon)

        if (index !== -1) {
            addons.splice(index, 1)
        }

        localStorage.setItem('addons', JSON.stringify(addons))

        p.remove()
    }
    document.getElementById('installed').appendChild(p)
}

function install() {
    let addon = document.getElementById('install').value
    if (!addons.includes(addon)) {
        addons.push(addon)
        let p = document.createElement('p')
        p.textContent = addon
        p.className = 'link'
        p.onclick = () => {
            const index = addons.indexOf(addon)

            if (index !== -1) {
                addons.splice(index, 1)
            }

            localStorage.setItem('addons', JSON.stringify(addons))

            p.remove()
        }
        document.getElementById('installed').appendChild(p)
    }

    localStorage.setItem('addons', JSON.stringify(addons))
}