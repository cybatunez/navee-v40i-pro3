let device = null;
let server = null;

const connectBtn = document.getElementById("connectBtn");
const disconnectBtn = document.getElementById("disconnectBtn");
const scanBtn = document.getElementById("scanBtn");

const deviceName = document.getElementById("deviceName");
const deviceInfo = document.getElementById("deviceInfo");

const connectionStatus = document.getElementById("connectionStatus");
const bluetoothState = document.getElementById("bluetoothState");
const gattState = document.getElementById("gattState");
const serviceCount = document.getElementById("serviceCount");

const servicesList = document.getElementById("servicesList");
const logElement = document.getElementById("log");


function log(message) {
  const time = new Date().toLocaleTimeString();
  logElement.textContent += `[${time}] ${message}\n`;
  logElement.scrollTop = logElement.scrollHeight;
}


async function checkBluetooth() {
  if (!navigator.bluetooth) {
    bluetoothState.textContent = "Nicht unterstützt";
    log("Web Bluetooth wird von diesem Browser nicht unterstützt.");
    return false;
  }

  const available = await navigator.bluetooth.getAvailability();

  bluetoothState.textContent =
    available ? "Verfügbar" : "Nicht verfügbar";

  return available;
}


connectBtn.addEventListener("click", async () => {
  try {
    const available = await checkBluetooth();

    if (!available) {
      alert("Bluetooth ist nicht verfügbar.");
      return;
    }

    log("Öffne Bluetooth-Geräteauswahl...");

    device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        "generic_access",
        "generic_attribute",
        "device_information",
        "battery_service"
      ]
    });

    device.addEventListener(
      "gattserverdisconnected",
      onDisconnected
    );

    deviceName.textContent = device.name || "Unbekanntes BLE-Gerät";
    deviceInfo.textContent = `ID: ${device.id}`;

    log(`Gerät ausgewählt: ${device.name || "Unbekannt"}`);

    log("Verbinde mit GATT-Server...");

    server = await device.gatt.connect();

    connectionStatus.textContent = "Verbunden";
    connectionStatus.className = "status online";

    gattState.textContent = "Verbunden";

    connectBtn.disabled = true;
    disconnectBtn.disabled = false;
    scanBtn.disabled = false;

    log("GATT-Verbindung erfolgreich.");

  } catch (error) {
    log(`FEHLER: ${error.message}`);
    console.error(error);
  }
});


scanBtn.addEventListener("click", async () => {
  if (!server || !server.connected) {
    log("Keine aktive GATT-Verbindung.");
    return;
  }

  try {
    servicesList.innerHTML = "";
    log("Scanne Services...");

    const services = await server.getPrimaryServices();

    serviceCount.textContent = services.length;

    log(`${services.length} Service(s) gefunden.`);

    for (const service of services) {
      const serviceElement = document.createElement("div");

      serviceElement.className = "service";

      serviceElement.innerHTML = `
        <strong>Service</strong><br>
        UUID: ${service.uuid}
      `;

      const characteristics =
        await service.getCharacteristics();

      for (const characteristic of characteristics) {
        const characteristicElement =
          document.createElement("div");

        characteristicElement.className =
          "characteristic";

        const properties = [];

        if (characteristic.properties.read) {
          properties.push("READ");
        }

        if (characteristic.properties.write) {
          properties.push("WRITE");
        }

        if (characteristic.properties.writeWithoutResponse) {
          properties.push("WRITE_NO_RESPONSE");
        }

        if (characteristic.properties.notify) {
          properties.push("NOTIFY");
        }

        if (characteristic.properties.indicate) {
          properties.push("INDICATE");
        }

        characteristicElement.innerHTML = `
          Characteristic<br>
          UUID: ${characteristic.uuid}<br>
          Rechte: ${properties.join(", ") || "Unbekannt"}
        `;

        serviceElement.appendChild(
          characteristicElement
        );
      }

      servicesList.appendChild(serviceElement);

      log(`Service: ${service.uuid}`);
    }

  } catch (error) {
    log(`Scan-Fehler: ${error.message}`);
    console.error(error);
  }
});


disconnectBtn.addEventListener("click", () => {
  if (device && device.gatt.connected) {
    device.gatt.disconnect();
  }
});


function onDisconnected() {
  log("Bluetooth-Verbindung getrennt.");

  connectionStatus.textContent = "Nicht verbunden";
  connectionStatus.className = "status offline";

  gattState.textContent = "Nicht verbunden";

  connectBtn.disabled = false;
  disconnectBtn.disabled = true;
  scanBtn.disabled = true;
}


checkBluetooth().then((available) => {
  if (available) {
    log("Web Bluetooth bereit.");
  }
});