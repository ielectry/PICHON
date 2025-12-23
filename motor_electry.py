import asyncio
import websockets
import mido
import json

# Configuración del puerto
PORT = 8765

async def handler(websocket):
    print("🔗 Overlay conectado al motor")
    
    # Buscamos la mesa Xone:96 entre los dispositivos conectados
    names = mido.get_input_names()
    port_name = next((n for n in names if 'xone' in n.lower()), None)
    
    if not port_name:
        print("❌ Error: Xone:96 no detectada. Revisa el USB.")
        return

    try:
        with mido.open_input(port_name) as inport:
            print(f"📡 Transmitiendo datos de {port_name}...")
            while True:
                # Procesamos mensajes MIDI pendientes
                for msg in inport.iter_pending():
                    if msg.type == 'control_change':
                        # Filtramos faders CH2 (CC 2) y CH3 (CC 3)
                        if msg.control in [2, 3]:
                            val = round(msg.value / 127, 3)
                            # Enviamos JSON con valor y canal
                            message = json.dumps({
                                "val": val,
                                "channel": msg.control
                            })
                            await websocket.send(message)
                
                # Pequeña pausa para no saturar la CPU
                await asyncio.sleep(0.01)
                
    except Exception as e:
        print(f"🔌 Conexión cerrada: {e}")

async def main():
    print(f"🚀 Motor Electry iniciado en ws://localhost:{PORT}")
    # Permitimos conexiones externas (como GitHub Pages) al motor local
    async with websockets.serve(handler, "127.0.0.1", PORT, origins=None):
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())