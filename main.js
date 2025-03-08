const canv = document.getElementById('game')
const ctx = canv.getContext('2d')

let game = []
for (let x = 0; x < 60; x++) {
    game[x] = []
    for (let y = 0; y < 40; y++) {
        game[x][y] = undefined
    }
}

let addons = []

if (localStorage.getItem('addons')) {
    addons = JSON.parse(localStorage.getItem('addons'))
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

let tunnel = "right"
let pass_ = 0
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
                        return
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
    },
    tunnel: {
        color: '#686868',
        selected: () => {
            tunnel = prompt("Which way? (right, left, up, down)")
        },
        placed: (pixel) => {
            pixel.way = tunnel.slice()
            if (!['right', 'left', 'up', 'down'].includes(pixel.way)) {
                game[pixel.x][pixel.y] = undefined
            }
        },
        behavior: (pixel) => {
            let trgX = pixel.x
            let trgY = pixel.y
    
            if (pixel.way == 'right') trgX++
            else if (pixel.way == 'left') trgX--
            else if (pixel.way == 'up') trgY--
            else if (pixel.way == 'down') trgY++

            if (!OOB(trgX, trgY) && !Empty(trgX, trgY)) {
                let neighbor = game[trgX][trgY]
                if (neighbor.power < pixel.power) {
                    neighbor.power = pixel.power - 1
                    if (neighbor.type == 'tunnel') {
                        bluestones[neighbor.type].behavior(neighbor) 
                    } else if (neighbor.type == 'dust') {
                        neighbor.power = pixel.power - 1
                    }
                }
            }
        }       
    },
    pass: {
        color: '#ffb',
        colorActivated: '#FFAB00',
        ignorePoweredProperty: true,
        selected: () => {
            pass_ = prompt("Minimal power for passage)")
        },
        placed: (pixel) => {
            pixel.min = pass_.slice()
        },
        behavior: (pixel) => {
            let ns = pixelNeighbors(pixel.x, pixel.y)
            let ns2 = []
        
            ns.forEach(n => {
                let neighbor = game[n[0]][n[1]]
                if (neighbor.power >= pixel.min) {
                    ns2.push(neighbor.power)
                }
            });
        
            if (ns2.length > 0) {
                pixel.power = Math.max(...ns2)
            } else {
                pixel.power = 0
            }
        },  
    }
}
bluestones.pass.ignore = Object.keys(bluestones)

let drawing = false
let erasing = false

canv.addEventListener('mousedown', (event) => {
    const rect = canv.getBoundingClientRect()
    const mouseX = event.clientX - rect.left
    const mouseY = event.clientY - rect.top

    const gameX = Math.floor(mouseX / 10)
    const gameY = Math.floor(mouseY / 10)

    if (!OOB(gameX, gameY)) {
        if (Empty(gameX, gameY)) {
            drawing = true
            erasing = false
            placeStone(gameX, gameY)
        } else {
            drawing = false
            erasing = true
            removeStone(gameX, gameY)
        }
    }
})

canv.addEventListener('mouseup', () => {
    drawing = false
    erasing = false
})

canv.addEventListener('mousemove', (event) => {
    const rect = canv.getBoundingClientRect()
    const mouseX = event.clientX - rect.left
    const mouseY = event.clientY - rect.top

    const gameX = Math.floor(mouseX / 10)
    const gameY = Math.floor(mouseY / 10)

    if (!OOB(gameX, gameY)) {
        document.getElementById('coords').textContent = `${gameX}, ${gameY}`
        document.getElementById('power').textContent = `Power: ${Empty(gameX, gameY) ? 0 : game[gameX][gameY].power}`
    }
    if (!drawing && !erasing) return

    if (drawing && Empty(gameX, gameY)) {
        placeStone(gameX, gameY)
    } else if (erasing && !Empty(gameX, gameY)) {
        removeStone(gameX, gameY)
    }
})

function placeStone(x, y) {
    game[x][y] = { type: selected.slice(), color: bluestones[selected].color.slice(), x: x, y: y, power: bluestones[selected].constantPower || 0 }
    if (bluestones[selected].colorActivated) {
        game[x][y]['colorActivated'] = bluestones[selected].colorActivated.slice()
    }
    let stone = bluestones[selected]
    if (stone.props) {
        let array = Object.keys(stone.props)
        array.forEach(key => {
            game[x][y][key] = stone.props[key]
        }) 
    }
    if (stone.placed) {
        stone.placed(game[x][y])
    }
}

function removeStone(x, y) {
    game[x][y] = undefined
}

function resetGame() {
    game = []
    for (let x = 0; x < 60; x++) {
        game[x] = []
        for (let y = 0; y < 40; y++) {
            game[x][y] = undefined
        }
    }
}

function update() {
    ctx.clearRect(0, 0, canv.width, canv.height)

    for (let x = 0; x < 60; x++) {
        for (let y = 0; y < 40; y++) {
            if (!Empty(x, y)) {
                let pixel = game[x][y]
                if (bluestones[pixel.type].behavior) {
                    bluestones[pixel.type].behavior(pixel)
                }
            }
        }
    }

    let prePower = []
    for (let x = 0; x < 60; x++) {
        prePower[x] = []
        for (let y = 0; y < 40; y++) {
            if (!Empty(x, y)) {
                prePower[x][y] = game[x][y].power
            }
        }
    }

    for (let x = 0; x < 60; x++) {
        for (let y = 0; y < 40; y++) {
            if (!Empty(x, y)) {
                let pixel = game[x][y]
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
                    let maxnp = 0 // max neighbor power
                    let powered = false
                    let ns = pixelNeighbors(pixel.x, pixel.y)
                    
                    ns.forEach(n => {
                        let nx = n[0], ny = n[1]
                        if (prePower[nx] && prePower[nx][ny] !== undefined) {
                            let neighborPower = prePower[nx][ny]
                            if (!bluestones[pixel.type].ignore || (!bluestones[pixel.type].ignore.includes(game[nx][ny].type))) {
                                if (neighborPower > maxnp) {
                                    maxnp = neighborPower
                                    powered = true
                                }
                            }
                        }
                    })
                    
                    if (powered) {
                        pixel.power = maxnp - 1
                    } else if (!bluestones[pixel.type].ignorePoweredProperty) {
                        pixel.power = 0
                    }
                }
                
                ctx.fillRect(x * 10, y * 10, 10, 10)
            }
        }
    }
    
    requestAnimationFrame(update)
}

function loadAddons() {
    addons.forEach(addon => {
        let script = document.createElement('script')
        script.src = 'addons/' + addon + '.js'
        document.body.appendChild(script)
    })
    setTimeout(setup,10)
}

function setup() {
    let bluestoneArray = Object.keys(bluestones)
    bluestoneArray.forEach(stone => {
        if (!bluestones[stone].ignore) {
            bluestones[stone].ignore = ["tunnel"]
        } else {
            if (!bluestones[stone].ignore.includes("tunnel")) {
                bluestones[stone].ignore.push("tunnel")
            }
        }
        let button = document.createElement('button')
        button.textContent = stone
        button.onclick = () => {
            selected = stone
            if (bluestones[stone].selected) {
                bluestones[stone].selected()
            }
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
