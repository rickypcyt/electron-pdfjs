import { app, BrowserWindow } from "electron";

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
  });

  win.loadURL("data:text/html;charset=utf-8," + encodeURIComponent("<h1>Hello Electron via Bun!</h1>"));
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

