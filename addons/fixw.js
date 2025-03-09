extraWidth = () => {
  width = 150
  document.getElementById('game').width = 1500
  xWidth = 1
  for (let x = 0; x < width; x++) {
    if (!game[x]) game[x] = [];
    for (let y = 0; y < 60; y++) {
        if (!game[x][y]) game[x][y] = undefined;
    }
}
}
