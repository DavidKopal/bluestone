const canv = document.getElementById('game')
const ctx = canv.getContext('2d')

let game = []
for (let x = 0; x < 100; x++) {
    game[x] = []
    for (let y = 0; y < 60; y++) {
        game[x][y] = undefined
    }
}

let brushSize = 1

let addons = []

if (localStorage.getItem('addons')) {
    addons = JSON.parse(localStorage.getItem('addons'))
}

let selected = 'dust'

function OOB(x, y) { // Out of bounds check
    return x < 0 || x >= 100 || y < 0 || y >= 60
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
    "#000040", "#000048", "#000050", "#000058", "#000060", "#000068",
    "#000070", "#000078", "#000080", "#000088", "#000090", "#000098",
    "#0000A0", "#0000A8", "#0000B0", "#0000B8", "#0000C0", "#0000C8",
    "#0000D0", "#0000D8", "#0000E0", "#0000E8", "#0000F0", "#0000F8",
    "#0000FF", "#0808FF", "#1010FF", "#1818FF", "#2020FF", "#2828FF"
]

let radios = []

let gen = 0
let channel = ''
let tunnel = "right"
let pass_ = 0
let bluestones = {
    dust: {
        color: "#000040",
    },
    generator: {
        color: "#FF0000",
        constantPower: 30
    },
    constant_generator: {
        color: "#FF1256",
        ignorePoweredProperty: true,
        selected: () => {
            gen = Number(prompt("Constant signal for the generator?"))
        },
        placed: (pixel) => {
            pixel.gen = gen
        },
        behavior: (pixel) => {
            pixel.power = pixel.gen
        }
    },
    copper: {
        color: "#b87333",
        ignore: ['torch', 'copper', 'extender']
    },
    concrete: {
        color: "#ededed",
        constantPower: 0,
        ignorePoweredProperty: true
    },
    torch: {
        color: "#004000",
        colorActivated: "#00ff00",
        props: {
            disabled: false
        },
        behavior: (pixel) => {
            let foundCopper = false
            let ns = pixelNeighbors(pixel.x, pixel.y)
            ns.forEach(n => {
                let neighbor = game[n[0]][n[1]]
                if (neighbor.type == 'copper') {
                    if (neighbor.power > 0) {
                        pixel.disabled = true
                        foundCopper = true
                    } else {
                        if (!foundCopper) {
                            pixel.disabled = false
                        }
                    }
                }
            })

            if (!pixel.disabled) {
                pixel.power = 30
            } else {
                pixel.power = 0
            }
        },
        ignorePoweredProperty: true, // Doesn't set power to 0 even if !powered
        ignore: ['dust', 'copper']
    },
    receiver: {
        color: '#ffbcbc',
        selected: () => {
            channel = prompt("Which channel to recieve on?")
        },
        placed: (pixel) => {
            pixel.channel = channel
            radios.push(pixel)
        },
        erased: (pixel) => {
            const index = radios.indexOf(pixel)

            if (index !== -1) {
                radios.splice(index, 1)
            }
        }
    },
    sender: {
        color: '#bcffbc',
        selected: () => {
            channel = prompt("Which channel to send to?")
        },
        placed: (pixel) => {
            pixel.channel = channel
        },
        behavior: (pixel) => {
            if (pixel.power > 0) {
                radios.forEach(radio => {
                    if (radio.channel == pixel.channel) {
                        radio.power = pixel.power
                    }
                })
            }
        }
    },
    lamp: {
        color: '#404000',
        colorActivated: "#FFFF00",
    },
    radio_lamp: {
        color: '#404000',
        colorActivated: "#FFFF00",
        selected: () => {
            channel = prompt("Which channel to recieve on?")
        },
        placed: (pixel) => {
            pixel.channel = channel
            radios.push(pixel)
        },
        erased: (pixel) => {
            const index = radios.indexOf(pixel)

            if (index !== -1) {
                radios.splice(index, 1)
            }
        },
        ignore: ['radio_lamp']
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
            })

            if (ns2.length > 0) {
                pixel.power = Math.max(...ns2)
            } else {
                pixel.power = 0
            }
        },
    },
    extender: {
        color: '#b400b4',
        behavior: (pixel) => {
            let ns = pixelNeighbors(pixel.x, pixel.y)
            let powered = false
            ns.forEach(n => {
                let neighbor = game[n[0]][n[1]]
                if (neighbor.type == 'copper' && neighbor.power > 0) {
                    powered = true
                }

            })
            if (powered) {
                pixel.power = 30
            } else {
                pixel.power = 0
            }
        },
        ignorePoweredProperty: true,
        ignore: ['copper']
    },
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
        if (!Empty(gameX, gameY)) {
            document.getElementById('elem').textContent = `Elem: ${game[gameX][gameY].type}`
        } else {
            document.getElementById('elem').textContent = "Elem: none"
        }
    }

    if (drawing) {
        placeStone(gameX, gameY)
    } else if (erasing) {
        removeStone(gameX, gameY)
    }
})


function placeStone(x, y) {
    let hBrush = Math.floor(brushSize / 2)
    for (let i = -hBrush; i <= hBrush; i++) {
        for (let j = -hBrush; j <= hBrush; j++) {
            let bx = x + i
            let by = y + j
            if (!OOB(bx, by)) {
                game[bx][by] = {
                    type: selected.slice(),
                    color: bluestones[selected].color.slice(),
                    x: bx,
                    y: by,
                    power: bluestones[selected].constantPower || 0
                }
                if (bluestones[selected].colorActivated) {
                    game[bx][by]['colorActivated'] = bluestones[selected].colorActivated.slice()
                }
                let stone = bluestones[selected]
                if (stone.props) {
                    let array = Object.keys(stone.props)
                    array.forEach(key => {
                        game[bx][by][key] = stone.props[key]
                    })
                }
                if (stone.placed) {
                    stone.placed(game[bx][by])
                }
            }
        }
    }
}

function removeStone(x, y) {
    let hBrush = Math.floor(brushSize / 2)
    for (let i = -hBrush; i <= hBrush; i++) {
        for (let j = -hBrush; j <= hBrush; j++) {
            let bx = x + i
            let by = y + j
            if (!OOB(bx, by)) {
                if (game[bx][by] !== undefined) {
                    if (game[bx][by].erased) {
                        game[bx][by].erased(game[bx][by])
                    }
                    game[bx][by] = undefined
                }
            }
        }
    }
}

function resetGame() {
    game = []
    for (let x = 0; x < 100; x++) {
        game[x] = []
        for (let y = 0; y < 60; y++) {
            game[x][y] = undefined
        }
    }
}

function update() {
    ctx.clearRect(0, 0, canv.width, canv.height)

    for (let x = 0; x < 100; x++) {
        for (let y = 0; y < 60; y++) {
            if (!Empty(x, y)) {
                let pixel = game[x][y]
                if (bluestones[pixel.type].behavior) {
                    bluestones[pixel.type].behavior(pixel)
                }
            }
        }
    }

    let prePower = []
    for (let x = 0; x < 100; x++) {
        prePower[x] = []
        for (let y = 0; y < 60; y++) {
            if (!Empty(x, y)) {
                prePower[x][y] = game[x][y].power
            }
        }
    }

    for (let x = 0; x < 100; x++) {
        for (let y = 0; y < 60; y++) {
            if (!Empty(x, y)) {
                let pixel = game[x][y]
                if (pixel.type == 'dust') {
                    ctx.fillStyle = dustColors[pixel.power]
                } else if (pixel.power > 0 && bluestones[pixel.type].colorActivated) {
                    ctx.fillStyle = bluestones[pixel.type].colorActivated
                } else {
                    ctx.fillStyle = pixel.color
                }
                if (bluestones[pixel.type].constantPower !== undefined) {
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
    setTimeout(setup, 100)
}

function save() {
    const file = new Blob([JSON.stringify(game)], { type: 'text/plain' })
    const a = document.createElement('a')
    const url = URL.createObjectURL(file)
    a.href = url
    a.download = 'bluestonesave.json'
    document.body.appendChild(a)
    a.click()
    setTimeout(() => {
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
    }, 0)
}

document.getElementById("fileInput").addEventListener("change", function (event) {
    const file = event.target.files[0]
    if (file) {
        const reader = new FileReader()
        reader.onload = function (e) {
            radios = []
            let parsed = JSON.parse(e.target.result)
            for (let x = 0; x < 100; x++) {
                for (let y = 0; y < 60; y++) {
                    if (parsed[x][y] == null) {
                        parsed[x][y] = undefined
                    } else {
                        if (parsed[x][y].type == "radio_lamp" || parsed[x][y].type == "reciever") {
                            radios.push(parsed[x][y]);
                        }                        
                    }
                }
            }
            game = parsed
        }
        reader.readAsText(file)
    }
})

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
        button.textContent = stone.replaceAll('_', ' ')
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
