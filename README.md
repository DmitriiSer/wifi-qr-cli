# Wi-Fi QR Code Generator (Node.js)

A professional Node.js CLI tool for generating Wi-Fi QR codes with custom styling. Features both interactive prompts and command-line flags with POSIX-style options.

## ✨ Features

- 🎯 **Interactive Mode**: Guided prompts for easy use
- ⚡ **Command-line Flags**: POSIX-style short and long options
- 🎨 **Custom Styling**: Square and circular module styles
- 📱 **iOS Compatible**: Optimized QR format for iPhone scanning
- 🖥️ **Terminal Display**: Built-in terminal QR code viewer
- 💾 **File Output**: High-quality PNG generation
- 🔒 **Security Support**: WPA/WPA2/WPA3, WEP, and Open networks

## 🚀 Installation

### Prerequisites

- Node.js 14.0.0 or higher
- npm (comes with Node.js)

### Install Dependencies

```bash
npm install
```

### Make Executable (Unix/Linux/macOS)

```bash
chmod +x wifi-qr.js
```

## 📖 Usage

### Interactive Mode

```bash
./wifi-qr.js
```

### Command-line Flags

#### Short Flags (Quick Usage)

```bash
# Terminal display
./wifi-qr.js -s MyWiFi -p mypassword123

# Save to file
./wifi-qr.js -s MyWiFi -p mypassword123 -o my-wifi

# Circle style
./wifi-qr.js -s MyWiFi -p mypassword123 --style circle -o my-wifi-circle
```

#### Long Flags (Readable)

```bash
# Terminal display
./wifi-qr.js --ssid MyWiFi --password mypassword123

# Save to file
./wifi-qr.js --ssid MyWiFi --password mypassword123 --output my-wifi

# Circle style with hidden network
./wifi-qr.js --ssid MyWiFi --password mypassword123 --style circle --hidden --output my-wifi
```

#### Mixed Flags (Flexible)

```bash
./wifi-qr.js -s MyWiFi --password mypassword123 --style circle -o my-wifi
```

### Available Options

| Short | Long         | Description                         | Default                         |
| ----- | ------------ | ----------------------------------- | ------------------------------- |
| `-s`  | `--ssid`     | Wi-Fi network name (SSID)           | _required_                      |
| `-p`  | `--password` | Wi-Fi password                      | _required for secured networks_ |
| `-t`  | `--security` | Security type: `wpa`, `wep`, `open` | `wpa`                           |
| `-H`  | `--hidden`   | Hidden network flag                 | `false`                         |
| `-S`  | `--style`    | QR style: `square`, `circle`        | `square`                        |
| `-o`  | `--output`   | Output filename (without extension) | _terminal display_              |
| `-h`  | `--help`     | Show help message                   |                                 |
| `-V`  | `--version`  | Show version number                 |                                 |

## 🎨 QR Code Styles

### Square Style (Default)

- **Description**: Classic square modules
- **Compatibility**: Maximum compatibility with all scanners
- **Use Case**: Production environments, maximum reliability

### Circle Style

- **Description**: Square corner patterns + circular data modules
- **Compatibility**: High compatibility (corners preserved for scanning)
- **Use Case**: Aesthetic designs while maintaining reliability

## 🔒 Security Types

| Type   | Description   | Use Case                           |
| ------ | ------------- | ---------------------------------- |
| `wpa`  | WPA/WPA2/WPA3 | Most modern networks (recommended) |
| `wep`  | WEP (legacy)  | Older networks (not recommended)   |
| `open` | No password   | Public networks                    |

## 📱 Output Options

### Terminal Display (Default)

- Displays QR code directly in terminal
- Great for quick testing and verification
- Works in any terminal environment

### File Output

- High-quality PNG files (512x512 pixels)
- Professional styling with proper borders
- Optimized for printing and sharing

## 🛠️ Examples

### Basic Usage

```bash
# Interactive mode - prompts for all information
./wifi-qr.js

# Quick terminal display
./wifi-qr.js -s "My Home WiFi" -p "password123"

# Save to file
./wifi-qr.js -s "My Home WiFi" -p "password123" -o home-wifi
```

### Advanced Usage

```bash
# Hidden network with circle style
./wifi-qr.js -s "Hidden-Network" -p "secret123" --hidden --style circle -o hidden-wifi

# Open network (no password)
./wifi-qr.js -s "Public-WiFi" --security open -o public-wifi

# WEP network (legacy)
./wifi-qr.js -s "Old-Router" -p "12345" --security wep -o legacy-wifi
```

### Mixed Flag Styles

```bash
# Short and long flags combined
./wifi-qr.js -s "MyWiFi" --password "mypass123" --style circle -o styled-wifi

# All long flags
./wifi-qr.js --ssid "MyWiFi" --password "mypass123" --security wpa --style circle --output styled-wifi
```

## 🔧 Development

### Run Tests

```bash
npm test
```

### View Help

```bash
npm run help
```

### Start Application

```bash
npm start
```

## 📋 Wi-Fi QR Code Format

The generated QR codes use the standard Wi-Fi QR format optimized for iOS devices:

```
WIFI:S:<SSID>;T:<SECURITY>;P:<PASSWORD>;;
```

**Field Order**: The `S`, `T`, `P` order is critical for iOS compatibility.

## 🐛 Troubleshooting

### QR Code Won't Scan

1. **Try square style**: More compatible with older scanners
2. **Check password**: Ensure no special characters are causing issues
3. **Verify network name**: SSID must match exactly
4. **Test security type**: Try different security options

### Command Not Found

```bash
# Make sure the script is executable
chmod +x wifi-qr.js

# Or run with node directly
node wifi-qr.js --help
```

### Module Import Errors

```bash
# Ensure all dependencies are installed
npm install

# Check Node.js version
node --version  # Should be 14.0.0 or higher
```

## 📦 Dependencies

- **commander**: POSIX-style CLI argument parsing
- **inquirer**: Interactive command-line prompts
- **@loskir/styled-qr-code-node**: Professional QR code generation with styling
- **qrcode-terminal**: Terminal QR code display
- **chalk**: Colorful terminal output

## 📄 License

MIT License

---

**Made with ❤️ for seamless Wi-Fi sharing**
