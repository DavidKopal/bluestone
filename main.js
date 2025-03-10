/*
!!!READ THIS IF YOU ARE ADDONING!!!

Do not use the compression property.
*/

const canv = document.getElementById('game')
const ctx = canv.getContext('2d')

let width = 100

let game = []
for (let x = 0; x < width; x++) {
    game[x] = []
    for (let y = 0; y < 60; y++) {
        game[x][y] = undefined
    }
}

let version = '1.1.2'
let subversion = '1.1.2.5'

let brushSize = 1

let addons = []

if (localStorage.getItem('addons')) {
    addons = JSON.parse(localStorage.getItem('addons'))
}

let selected = 'dust'

function OOB(x, y) { // Out of bounds check
    return x < 0 || x >= width || y < 0 || y >= 60
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

let gdustColors = [
    "#004000", "#004800", "#005000", "#005800", "#006000", "#006800",
    "#007000", "#007800", "#008000", "#008800", "#009000", "#009800",
    "#00A000", "#00A800", "#00B000", "#00B800", "#00C000", "#00C800",
    "#00D000", "#00D800", "#00E000", "#00E800", "#00F000", "#00F800",
    "#00FF00", "#08FF08", "#10FF10", "#18FF18", "#20FF20", "#28FF28"
]

let radios = []

let gen = 0
let channel = ''
let tunnel = "right"
let tunnelInput = "right"
let pass_ = 0
let cTime = 0
let bluestones = {
    dust: {
        color: "#000040",
        description: "Like your everyday's wire.",
        compression: "$d",
        ignore: ["green_dust"]
    },
    green_dust: {
        color: "#004000",
        description: "Like your everyday's wire but green.",
        compression: "$gd",
        ignore: ["dust"]
    },
    generator: {
        color: "#FF0000",
        constantPower: 30,
        description: "Generates power out of air molecules.",
        compression: "$g"
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
        },
        description: "Generates a set power amount out of air molecules.",
        compression: "$c"
    },
    copper: {
        color: "#b87333",
        ignore: ['torch', 'copper', 'extender', 'switch'],
        description: "Used for manipulation with batteries, extenders, torches and more.",
        compression: "$m"
    },
    concrete: {
        color: "#ededed",
        constantPower: 0,
        ignorePoweredProperty: true,
        description: "Does nothing for the world, like a communist.",
        compression: "$o"
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
        ignore: ['dust', 'copper'],
        description: "Generator which can be turned on/off with powered copper.",
        compression: "$t"
    },
    reciever: {
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
        },
        description: "Recieves power from senders.",
        compression: "$r"
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
        },
        description: "Sends power to recievers and radio lamps.",
        compression: "$s"
    },
    lamp: {
        color: '#404000',
        colorActivated: "#FFFF00",
        description: "Lights up when powered.",
        compression: "$l"
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
        ignore: ['radio_lamp'],
        description: "Lights up when recieving a signal.",
        compression: "$rl"
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
        },
        description: "Redirects signals to go a specific way.",
        compression: "$tn"
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
        description: "Allows power to go through when it's equal to or higher than a set value.",
        compression: "$p"
    },
    rev_pass: {
        color: '#ffb',
        colorActivated: '#FFAB00',
        ignorePoweredProperty: true,
        selected: () => {
            pass_ = prompt("Maximum power for passage)")
        },
        placed: (pixel) => {
            pixel.max = pass_.slice()
        },
        behavior: (pixel) => {
            let ns = pixelNeighbors(pixel.x, pixel.y)
            let ns2 = []

            ns.forEach(n => {
                let neighbor = game[n[0]][n[1]]
                if (neighbor.power <= pixel.max) {
                    ns2.push(neighbor.power)
                }
            })

            if (ns2.length > 0) {
                pixel.power = Math.max(...ns2)
            } else {
                pixel.power = 0
            }
        },
        description: "Allows power to go through when it's equal to or lower than a set value.",
        compression: "$rp"
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
        ignore: ['copper'],
        description: "Extends signal with powered copper.",
        compression: "$e"
    },
    battery: {
        color: '#bede00',
        behavior: (pixel) => {
            let ns = pixelNeighbors(pixel.x, pixel.y)
            let ns2 = []
            let powered = false
            ns.forEach(n => {
                let neighbor = game[n[0]][n[1]]
                if (neighbor.type !== 'copper') {
                    ns2.push(neighbor)
                }
                if (neighbor.type == 'copper' && neighbor.power > 0) {
                    powered = true
                }
                if (powered) {
                    ns2.forEach(neighbor => {
                        if (neighbor.power < pixel.power) {
                            neighbor.power = pixel.power
                        }
                    })
                }

            })
        },
        ignorePoweredProperty: true,
        ignore: ['copper'],
        description: "Stores and releases energy when reacting with powered copper.",
        compression: "$b"
    },
    clock: {
        color: '#ffd700',
        colorActivated: '#ffa800',
        ignorePoweredProperty: true,
        selected: () => {
            let input = prompt("Time in ms")
            cTime = parseInt(input) || 1000
        },
        placed: (pixel) => {
            pixel.time = cTime
            pixel.lUpdate = Date.now()
            pixel.activated = false
        },
        props: {
            activated: false,
        },
        behavior: (pixel) => {
            let now = Date.now()
            if (now - pixel.lUpdate >= pixel.time) {
                pixel.activated = !pixel.activated
                pixel.lUpdate = now
            }

            if (pixel.activated) {
                pixel.power = 30
            } else {
                pixel.power = 0
            }
        },
        description: "Sends out a signal repeatedly.",
        compression: "$cl"
    },
    switch: {
        color: '#a0a0a0',
        colorActivated: '#56ff56',
        ignorePoweredProperty: true,
        placed: (pixel) => {
            pixel.tState = false
            pixel.lcp = false
        },
        behavior: (pixel) => {
            let ns = pixelNeighbors(pixel.x, pixel.y)
            let medp = ns.some(n => {
                let neighbor = game[n[0]][n[1]]
                return neighbor.type === "copper" && neighbor.power > 0
            })

            if (medp && !pixel.lcp) {
                pixel.tState = !pixel.tState
            }

            pixel.lcp = medp

            if (pixel.tState) {
                pixel.power = 30
            } else {
                pixel.power = 0
            }
        },
        description: "Toggles on/off when a powered copper block is next to it.",
        compression: "$sw",
        ignore: ["copper"],
    },
    button: {
        color: '#a0a0a0',
        colorActivated: '#505050',
        ignorePoweredProperty: true,
        props: {
            clicked: 0
        },
        behavior: (pixel) => {
            if (pixel.clicked > 0) {
                pixel.clicked--
                pixel.power = 30
            } else {
                pixel.power = 0
            }
        },
        description: "Sents out a short signal when toggled.",
        compression: "$bt",
    },
    lever: {
        color: '#a0a0a0',
        colorActivated: '#505050',
        ignorePoweredProperty: true,
        props: {
            toggled: false
        },
        behavior: (pixel) => {
            if (pixel.toggled) {
                pixel.power = 30
            } else {
                pixel.power = 0
            }
        },
        description: "Turns on/off when toggled..",
        compression: "$bt",
    },
    toggle: {
        color: '#f00',
        tool: (pixel) => {
            if (pixel.type == "button" && pixel.clicked == 0) {
                pixel.clicked = 80
            } else if (pixel.type == "lever") {
                if (pixel.toggled == false) {
                    pixel.toggled = true
                } else {
                    pixel.toggled = false
                }
            }
        },
        description: "Toggles buttons and levers.",
    },
    bridge: {
        color: '#686868',
        behavior: (pixel) => {
            if (!Empty(pixel.x - 1, pixel.y) && !Empty(pixel.x + 1, pixel.y)) {
                let left = game[pixel.x - 1][pixel.y]
                let right = game[pixel.x + 1][pixel.y]
                if (left.type !== right.type) return;
                if (left.power > right.power) {
                    right.power = pixel.power - 1
                } else if (left.power < right.power) {
                    left.power = pixel.power - 1
                }
            }
            if (!Empty(pixel.x, pixel.y - 1) && !Empty(pixel.x, pixel.y + 1)) {
                let up = game[pixel.x][pixel.y - 1]
                let down = game[pixel.x][pixel.y + 1]
                if (up.type !== down.type) return;
                if (up.power > down.power) {
                    down.power = up.power - 1
                } else if (up.power < down.power) {
                    up.power = down.power - 1
                }
            }
        },
        description: "Allows signals to go straight through each other.",
        compression: "$tn",
        ignore: ["bridge", "multi_bridge"]
    },
    multi_bridge: {
        color: '#686868',
        behavior: (pixel) => {
            let ns = pixelNeighbors(pixel.x, pixel.y)
            ns.forEach(n => {
                let neighbor = game[n[0]][n[1]]
                ns.forEach(n2 => {
                    let neighbor2 = game[n2[0]][n2[1]]
                    if (neighbor !== neighbor2) {
                        if (neighbor.type !== neighbor2.type) return;
                        if (neighbor.power > neighbor2.power) {
                            neighbor2.power = neighbor.power - 1
                        } else if (neighbor.power < neighbor2.power) {
                            neighbor.power = neighbor2.power - 1
                        }
                    }
                })
            })
        },
        description: "Allows signals to go straight through each other.",
        compression: "$tn",
        ignore: ["bridge", "multi_bridge"]
    }
}
bluestones.pass.ignore = Object.keys(bluestones)
bluestones.button.ignore = Object.keys(bluestones)

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

let mX = 0
let mY = 0

canv.addEventListener('mousemove', (event) => {
    const rect = canv.getBoundingClientRect()
    const mouseX = event.clientX - rect.left
    const mouseY = event.clientY - rect.top

    const gameX = Math.floor(mouseX / 10)
    const gameY = Math.floor(mouseY / 10)

    mX = gameX * 10
    mY = gameY * 10

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

    let offset = (brushSize % 2 === 0) ? 0 : 1

    for (let i = -hBrush; i < hBrush + offset; i++) {
        for (let j = -hBrush; j < hBrush + offset; j++) {
            let bx = x + i
            let by = y + j
            if (!OOB(bx, by)) {
                if (bluestones[selected].tool) {
                    if (!Empty(bx, by)) {
                        bluestones[selected].tool(game[bx][by])
                    }
                } else {
                    game[bx][by] = {
                        type: selected.slice(),
                        x: bx,
                        y: by,
                        power: bluestones[selected].constantPower || 0
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
}



function removeStone(x, y) {
    let hBrush = Math.floor(brushSize / 2)
    let offset = (brushSize % 2 === 0) ? 0 : 1

    for (let i = -hBrush; i < hBrush + offset; i++) {
        for (let j = -hBrush; j < hBrush + offset; j++) {
            let bx = x + i
            let by = y + j
            if (bluestones[selected].tool && !Empty(bx, by)) {
                bluestones[selected].tool(game[bx][by])
            } else {
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
}

function resetGame() {
    game = []
    for (let x = 0; x < width; x++) {
        game[x] = []
        for (let y = 0; y < 60; y++) {
            game[x][y] = undefined
        }
    }
}

let xWidth = 0

function extraWidth() {
    width = 150
    document.getElementById('game').width = 1500
    xWidth = 1
    resetGame()
}

function update() {
    ctx.clearRect(0, 0, canv.width, canv.height)

    for (let x = 0; x < width; x++) {
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
    for (let x = 0; x < width; x++) {
        prePower[x] = []
        for (let y = 0; y < 60; y++) {
            if (!Empty(x, y)) {
                prePower[x][y] = game[x][y].power
            }
        }
    }

    for (let x = 0; x < width; x++) {
        for (let y = 0; y < 60; y++) {
            if (!Empty(x, y)) {
                let pixel = game[x][y]
                if (pixel.type == 'dust') {
                    ctx.fillStyle = dustColors[pixel.power]
                } else if (pixel.type == "green_dust") {
                    ctx.fillStyle = gdustColors[pixel.power]
                } else if (pixel.power > 0 && bluestones[pixel.type].colorActivated) {
                    ctx.fillStyle = bluestones[pixel.type].colorActivated
                } else {
                    ctx.fillStyle = bluestones[pixel.type].color
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

    let hBrush = (brushSize % 2 === 0) ? (brushSize / 2) : Math.floor(brushSize / 2)
    let size = brushSize * 10

    ctx.strokeStyle = '#ffffff'
    ctx.strokeRect(Math.floor(mX / 10 - hBrush) * 10, Math.floor(mY / 10 - hBrush) * 10, size, size)

    requestAnimationFrame(update)
}

function loadAddons() {
    addons.forEach(addon => {
        let script = document.createElement('script')
        script.src = 'addons/' + addon + '.js'
        document.body.appendChild(script)
    })
    setup()
}

function save() {
    let stringified = JSON.stringify(game)
    stringified = stringified.replaceAll('null,null,null,null,null', '&'),
        stringified = stringified.replaceAll('[&,&,&,&,&,&,&,&,&,&,&,&]', 'Đ')
    stringified = stringified.replaceAll('null,null,null,null', '@')
    stringified = stringified.replaceAll('[&,&,&,@,', 'đ')
    stringified = stringified.replaceAll('null,null,null', 'Ł')
    stringified = stringified.replaceAll('null,null', '$')
    stringified = stringified.replaceAll('null', '€')
    stringified = stringified.replaceAll('type', '!t')
    stringified = stringified.replaceAll('power', '!p')
    const file = new Blob([xWidth + '<w>' + stringified + '-/-' + version], { type: 'text/plain' })
    const a = document.createElement('a')
    const url = URL.createObjectURL(file)
    a.href = url
    a.download = 'bluestonesave.bs1'
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
            xWidth = 0
            radios = []
            let stringified = e.target.result
            stringified = stringified.replaceAll('Đ', '[&,&,&,&,&,&,&,&,&,&,&,&]')
            stringified = stringified.replaceAll('đ', '[&,&,&,@,')
            stringified = stringified.replaceAll('&', 'null,null,null,null,null')
            stringified = stringified.replaceAll('@', 'null,null,null,null')
            stringified = stringified.replaceAll('Ł', 'null,null,null')
            stringified = stringified.replaceAll('$', 'null,null')
            stringified = stringified.replaceAll('€', 'null')
            stringified = stringified.replaceAll('!t', 'type')
            stringified = stringified.replaceAll('!p', 'power')
            toparse = stringified.split('-/-')
            toparse2 = toparse[0].split('<w>')

            let parsed = JSON.parse(toparse2[1].trim())
            if (toparse2[0] == '1') {
                extraWidth()
            }
            for (let x = 0; x < width; x++) {
                for (let y = 0; y < 60; y++) {
                    if (parsed[x][y] == null) {
                        parsed[x][y] = undefined
                    } else {
                        if (parsed[x][y].type == "radio_lamp" || parsed[x][y].type == "reciever") {
                            radios.push(parsed[x][y])
                        }
                    }
                }
            }
            game = parsed
        }
        reader.readAsText(file)
    }
})

let allIgnore = ["tunnel", "battery", "bridge", "multi_bridge"]

function addonButton(stone) {
    if (document.getElementById('elem-' + stone)) return;
    let button = document.createElement('button')
    button.textContent = stone.replaceAll('_', ' ')
    button.id = 'elem-' + stone
    button.onclick = () => {
        document.getElementById("description").textContent = bluestones[stone].description
        document.getElementById('elem-' + selected).classList.remove('stone-selected')
        document.getElementById('elem-' + selected).classList.add('stone-unselected')

        selected = stone

        button.classList.add('stone-selected')
        button.classList.remove('stone-unselected')

        if (bluestones[stone].selected) {
            bluestones[stone].selected()
        }

        button.classList.add('stoneselected')
    }

    button.className = 'stone'
    button.style.backgroundColor = bluestones[stone].color

    if (bluestones[stone].colorActivated) {
        button.style.background = `linear-gradient(to right, ${bluestones[stone].color}, ${bluestones[stone].colorActivated})`
    }

    if (bluestones[stone].tool) {
        document.getElementById('tools').appendChild(button)
    } else {
        document.getElementById('buttons').appendChild(button)
    }
}

function setup() {
    let bluestoneArray = Object.keys(bluestones)
    bluestoneArray.forEach(stone => {
        allIgnore.forEach(ignored => {
            if (!bluestones[stone].ignore) {
                bluestones[stone].ignore = [ignored]
            } else {
                if (!bluestones[stone].ignore.includes(ignored)) {
                    bluestones[stone].ignore.push(ignored)
                }
            }
        })
        if (document.getElementById('elem-' + stone)) return;
        let button = document.createElement('button')
        button.textContent = stone.replaceAll('_', ' ')
        button.id = 'elem-' + stone
        button.onclick = () => {
            document.getElementById("description").textContent = bluestones[stone].description
            document.getElementById('elem-' + selected).classList.remove('stone-selected')
            document.getElementById('elem-' + selected).classList.add('stone-unselected')

            selected = stone

            button.classList.add('stone-selected')
            button.classList.remove('stone-unselected')

            if (bluestones[stone].selected) {
                bluestones[stone].selected()
            }

            button.classList.add('stoneselected')
        }

        button.className = 'stone'
        button.style.backgroundColor = bluestones[stone].color

        if (bluestones[stone].colorActivated) {
            button.style.background = `linear-gradient(to right, ${bluestones[stone].color}, ${bluestones[stone].colorActivated})`
        }

        if (bluestones[stone].tool) {
            document.getElementById('tools').appendChild(button)
        } else {
            document.getElementById('buttons').appendChild(button)
        }
    })

    update()
}

loadAddons()
