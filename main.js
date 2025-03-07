const canv = document.getElementById('game')
const ctx = canv.getContext('2d')

let game = []
for (let x = 0; x < 60; x++) {
    game[x] = []
    for (let y = 0; y < 40; y++) {
        game[x][y] = undefined
    }
}

let mods = []

if (localStorage.getItem('mods')) {
    mods = JSON.parse(localStorage.getItem('mods'))
}

let selected = 'dust'

function OOB(x, y) { // Out of bounds check
    return x < 0 || x >= 60 || y < 0 || y >= 40
}

function Empty(x, y) {
    if (OOB(x, y)) {
        console.log(`Pixel (${x},${y}) is out of bounds!`)
        return false
    }
    return game[x][y] === undefined
}

function pixelNeighbors(x, y) {
    let neighbors = []
    if (!OOB(x + 1, y) && !Empty(x + 1, y)) neighbors.push([x + 1, y])
    if (!OOB(x - 1, y) && !Empty(x - 1, y)) neighbors.push([x - 1, y])
    if (!OOB(x, y + 1) && !Empty(x, y + 1)) neighbors.push([x, y + 1])
    if (!OOB(x, y - 1) && !Empty(x, y - 1)) neighbors.push([x, y - 1])
    return neighbors
}

let dustColors = [
    "#000040", "#000050", "#000060", "#000070", "#000080",
    "#000090", "#0000A0", "#0000B0", "#0000C0", "#0000D0",
    "#0000E0", "#0000F0", "#0000FF", "#1010FF", "#2020FF"
]

let bluestones = {
    dust: {
        color: "#000040",
    },
    generator: {
        color: "#FF0000",
        constantPower: 15
    },
    concrete: {
        color: "#FFFFFF",
        ignore: ['torch', 'concrete']
    },
    torch: {
        color: "#004000",
        colorActivated: "#00ff00",
        props: {
            disabled: false
        },
        behavior: (pixel) => {
            let ns = pixelNeighbors(pixel.x, pixel.y)
            ns.forEach(n => {
                let neighbor = game[n[0]][n[1]]
                if  (neighbor.type == 'concrete') {
                    if (neighbor.power > 0) {
                        pixel.disabled = true
                    } else {
                        pixel.disabled = false
                    }
                }
            })

            if (!pixel.disabled) {
                pixel.power = 15
            } else {
                pixel.power = 0
            }
        },
        ignorePoweredProperty: true, // Doesn't set power to 0 even if !powered
        ignore: ['dust', 'concrete']
    },
    lamp: {
        color: '#404000',
        colorActivated: "#FFFF00",
    }
}

canv.addEventListener('click', (event) => {
    const rect = canv.getBoundingClientRect()
    const mouseX = event.clientX - rect.left
    const mouseY = event.clientY - rect.top

    const gameX = Math.floor(mouseX / 10) // Assuming pixelSize = 10
    const gameY = Math.floor(mouseY / 10)

    if (!OOB(gameX, gameY)) {
        if (Empty(gameX, gameY)) {
            game[gameX][gameY] = { type: selected.slice(), color: bluestones[selected].color.slice(), x: gameX, y: gameY, power: bluestones[selected].constantPower || 0 }
            if (bluestones[selected].colorActivated) {
                game[gameX][gameY]['colorActivated'] = bluestones[selected].colorActivated.slice()
            }
            let stone = bluestones[selected]
            if (stone.props) {
                let array = Object.keys(stone.props)
                array.forEach(key => {
                    game[gameX][gameY][key] = stone.props[key]
                }) 
            }
        } else {
            game[gameX][gameY] = undefined
        }
    }
})

function update() {
    ctx.clearRect(0, 0, canv.width, canv.height)
    for (let x = 0; x < 60; x++) {
        for (let y = 0; y < 40; y++) {
            if (!Empty(x, y)) {
                let pixel = game[x][y]
                if (bluestones[pixel.type].behavior) {
                    bluestones[pixel.type].behavior(pixel)
                }
                if (pixel.type == 'dust') {
                    ctx.fillStyle = dustColors[pixel.power]
                } else if (pixel.power > 0 && bluestones[pixel.type].colorActivated) {
                    ctx.fillStyle = bluestones[pixel.type].colorActivated
                } else {
                    ctx.fillStyle = pixel.color
                }

                if (bluestones[pixel.type].constantPower) {
                    pixel.power = bluestones[pixel.type].constantPower
                } else {
                    let powered = false
                    let ns = pixelNeighbors(pixel.x, pixel.y)
                    ns.forEach(n => {
                        let neighbor = game[n[0]][n[1]]
                        if (!bluestones[pixel.type].ignore || !bluestones[pixel.type].ignore.includes(neighbor.type)) {
                            if (neighbor && neighbor.power > pixel.power) {
                                pixel.power = neighbor.power - 1
                                powered = true
                            }
                        }                        
                    })
                    if (!powered) {
                        if (!bluestones[pixel.type].ignorePoweredProperty) {
                            pixel.power = 0
                        } else {
                            if (bluestones[pixel.type].ignorePoweredProperty == true) {
                                pixel.power = pixel.power
                            }
                        }
                    }
                }

                ctx.fillRect(x * 10, y * 10, 10, 10)
            }
        }
    }
    requestAnimationFrame(update)
}

function loadAddons() {
    mods.forEach(mod => {
        let script = document.createElement('script')
        script.src = 'addons/' + mod + '.js'
        document.body.appendChild(script)
    })
    setTimeout(setup,10)
}

function setup() {
    let bluestoneArray = Object.keys(bluestones)
    bluestoneArray.forEach(stone => {
        let button = document.createElement('button')
        button.textContent = stone
        button.onclick = () => {
            selected = stone
        }
        button.className = 'stone'
        button.style.backgroundColor = bluestones[stone].color

        if (bluestones[stone].colorActivated) {
            button.style.background = `linear-gradient(to right, ${bluestones[stone].color}, ${bluestones[stone].colorActivated})`
        }
    
        document.getElementById('buttons').appendChild(button)
    })
    
    update()
}

loadAddons()
