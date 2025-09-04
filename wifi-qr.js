#!/usr/bin/env node

const { Command } = require('commander');
const inquirer = require('inquirer');
const QRCode = require('qrcode-terminal');
const chalk = require('chalk');
const { QRCodeCanvas } = require('@loskir/styled-qr-code-node');
const path = require('path');
const fs = require('fs');

// Security types mapping (same as Go version)
const SecurityTypes = [
    'WPA2/WPA3 (Most Common)',
    'WPA (Legacy)', 
    'WEP (Legacy)',
    'Open (No Password)'
];

// QR Styles (same as Go version)
const QRStyles = [
    { name: 'square', description: 'Classic squares (maximum compatibility)' },
    { name: 'circle', description: 'Square corners + circular data (aesthetic & reliable)' }
];

// QR Code colors available
const QRColors = [
    { name: 'black', hex: '#000000', description: 'Black (default, maximum compatibility)' },
    { name: 'blue', hex: '#0066CC', description: 'Blue (professional)' },
    { name: 'green', hex: '#00AA00', description: 'Green (nature)' },
    { name: 'red', hex: '#CC0000', description: 'Red (attention)' },
    { name: 'purple', hex: '#6600CC', description: 'Purple (creative)' },
    { name: 'orange', hex: '#FF6600', description: 'Orange (energetic)' },
    { name: 'custom', hex: '', description: 'Custom hex color (e.g., #FF5733)' }
];

class WiFiConfig {
    constructor() {
        this.ssid = '';
        this.password = '';
        this.security = '';
        this.hidden = false;
        this.style = 'square';
        this.color = 'black';
    }
}

class WiFiQRGenerator {
    constructor() {
        this.program = new Command();
        this.setupCLI();
    }

    setupCLI() {
        this.program
            .name('wifi-qr')
            .description('Wi-Fi QR Code Generator\nGenerate QR codes for Wi-Fi networks with custom styling')
            .version('2.0.0')
            .option('-s, --ssid <string>', 'Wi-Fi network name (SSID)')
            .option('-p, --password <string>', 'Wi-Fi password')
            .option('-t, --security <string>', 'Security type: wpa, wep, open (default: wpa)')
            .option('-H, --hidden', 'Hidden network', false)
            .option('-S, --style <string>', 'QR style: square, circle (default: square)')
            .option('-c, --color <string>', 'QR color: black, blue, green, red, purple, orange, or hex code (default: black)')
            .option('-o, --output <string>', 'Output filename (without extension) - saves to file instead of terminal')
            .configureHelp({
                helpWidth: 100,
                sortSubcommands: true
            })
            .addHelpText('after', this.getExtendedHelp());

        this.program.action(async (options) => {
            await this.run(options);
        });
    }

    getExtendedHelp() {
        return `
Examples:
  # Interactive mode (no flags)
  wifi-qr

  # Quick terminal display (default) - short flags
  wifi-qr -s MyWiFi -p mypass123

  # Save to file - long flags
  wifi-qr --ssid MyWiFi --password mypass123 --output my-wifi

  # Generate circle style - mixed flags
  wifi-qr -s MyWiFi -p mypass123 --style circle -o my-wifi

  # Custom colors
  wifi-qr -s MyWiFi -p mypass123 --color blue -o my-wifi-blue
  wifi-qr -s MyWiFi -p mypass123 -c "#FF5733" --style circle -o custom-color

Security Types:
  wpa    - WPA/WPA2/WPA3 (most common)
  wep    - WEP (legacy, not recommended)
  open   - No password

QR Styles:
  square       - Classic squares (maximum compatibility)
  circle       - Square corners + circular data (aesthetic & reliable)

Notes:
  - Default behavior: displays QR code in terminal
  - Use -o/--output to save to file instead of terminal display
  - Supports both short (-s) and long (--ssid) POSIX-style flags`;
    }

    async run(options) {
        console.log(chalk.blue('🔗 Wi-Fi QR Code Generator'));
        console.log(chalk.blue('==========================\n'));

        try {
            // Collect Wi-Fi information
            const config = await this.collectWiFiInfo(options);
            
            // Generate QR content
            const qrContent = this.generateWiFiQRContent(config);
            
            // Display debug information
            this.displayDebugInfo(config, qrContent);
            
            // Add style-specific warnings
            this.displayStyleWarnings(config);
            
            // Generate QR code
            if (options.output) {
                await this.generateQRFile(qrContent, options.output, config);
            } else {
                this.displayQRTerminal(qrContent);
                
                // Ask if user wants to save to file (interactive mode only)
                const hasAnyFlags = this.hasAnyFlags(options);
                if (!hasAnyFlags) {
                    const saveAnswer = await inquirer.prompt([{
                        type: 'confirm',
                        name: 'saveToFile',
                        message: 'Do you want to save this QR code to a file?',
                        default: false
                    }]);
                    
                    if (saveAnswer.saveToFile) {
                        const filenameAnswer = await inquirer.prompt([{
                            type: 'input',
                            name: 'filename',
                            message: 'Enter filename (without .png extension):',
                            default: 'wifi-qr',
                            validate: (input) => {
                                if (!input.trim()) {
                                    return 'Filename cannot be empty';
                                }
                                return true;
                            }
                        }]);
                        
                        await this.generateQRFile(qrContent, filenameAnswer.filename, config);
                    }
                }
            }
            
            console.log(chalk.green('\n✅ Wi-Fi QR code generated successfully!'));
            console.log(chalk.cyan('📱 To use: Open Camera app on iPhone and point at QR code'));
            
        } catch (error) {
            console.error(chalk.red('❌ Error:', error.message));
            process.exit(1);
        }
    }

    async collectWiFiInfo(options) {
        const config = new WiFiConfig();
        const hasAnyFlags = this.hasAnyFlags(options);

        // SSID
        if (options.ssid) {
            config.ssid = options.ssid;
            console.log(chalk.green(`📡 Using SSID from flag: ${config.ssid}`));
        } else if (hasAnyFlags) {
            throw new Error('SSID is required when using flags. Use -s/--ssid flag');
        } else {
            const answer = await inquirer.prompt([{
                type: 'input',
                name: 'ssid',
                message: 'Enter Wi-Fi Network Name (SSID):',
                validate: input => input.trim() !== '' || 'SSID cannot be empty'
            }]);
            config.ssid = answer.ssid;
        }

        // Security
        if (options.security) {
            config.security = this.mapSecurityType(options.security);
            console.log(chalk.green(`🔒 Using security from flag: ${options.security}`));
        } else if (hasAnyFlags) {
            config.security = 'WPA'; // Default for flags
            console.log(chalk.yellow('🔒 Using default security: WPA (no -t/--security flag provided)'));
        } else {
            const answer = await inquirer.prompt([{
                type: 'list',
                name: 'security',
                message: 'Select Wi-Fi Security Type:',
                choices: SecurityTypes,
                default: SecurityTypes[0]
            }]);
            config.security = this.mapSecurityFromChoice(answer.security);
        }

        // Password (only for secured networks)
        if (config.security !== 'nopass') {
            if (options.password) {
                config.password = options.password;
                console.log(chalk.green(`🔑 Using password from flag: ${'*'.repeat(config.password.length)}`));
            } else if (hasAnyFlags) {
                throw new Error('Password is required for secured networks. Use -p/--password flag or -t/--security open');
            } else {
                const answer = await inquirer.prompt([{
                    type: 'password',
                    name: 'password',
                    message: 'Enter Wi-Fi Password:',
                    mask: '*',
                    validate: input => input.trim() !== '' || 'Password cannot be empty for secured networks'
                }]);
                config.password = answer.password;
            }
        }

        // Hidden
        if (options.hidden) {
            config.hidden = true;
            console.log(chalk.green('👁️ Using hidden flag: true'));
        } else if (hasAnyFlags) {
            config.hidden = false;
            console.log(chalk.yellow('👁️ Using default hidden: false (no -H/--hidden flag provided)'));
        } else {
            const answer = await inquirer.prompt([{
                type: 'confirm',
                name: 'hidden',
                message: 'Is this a hidden network?',
                default: false
            }]);
            config.hidden = answer.hidden;
        }

        // Style
        if (options.style) {
            if (this.isValidStyle(options.style)) {
                config.style = options.style;
                console.log(chalk.green(`🎨 Using style from flag: ${config.style}`));
            } else {
                config.style = 'square';
                console.log(chalk.yellow('🎨 Invalid style, using default: square'));
            }
        } else if (hasAnyFlags) {
            config.style = 'square';
            console.log(chalk.yellow('🎨 Using default style: square (no -S/--style flag provided)'));
        } else {
            const styleChoices = QRStyles.map(style => 
                `${style.name} - ${style.description}`
            );
            const answer = await inquirer.prompt([{
                type: 'list',
                name: 'style',
                message: 'Choose QR code style:',
                choices: styleChoices,
                default: styleChoices[0]
            }]);
            config.style = answer.style.split(' - ')[0];
        }

        // Color
        if (options.color) {
            if (this.isValidColor(options.color)) {
                config.color = options.color;
                console.log(chalk.green(`🎨 Using color from flag: ${config.color}`));
            } else {
                config.color = 'black';
                console.log(chalk.yellow('🎨 Invalid color, using default: black'));
            }
        } else if (hasAnyFlags) {
            config.color = 'black';
            console.log(chalk.yellow('🎨 Using default color: black (no -c/--color flag provided)'));
        } else {
            const colorChoices = QRColors.map(color => 
                `${color.name} - ${color.description}`
            );
            const answer = await inquirer.prompt([{
                type: 'list',
                name: 'color',
                message: 'Choose QR code color:',
                choices: colorChoices,
                default: colorChoices[0]
            }]);
            
            const selectedColorName = answer.color.split(' - ')[0]; // Extract color name from choice
            
            if (selectedColorName === 'custom') {
                const customAnswer = await inquirer.prompt([{
                    type: 'input',
                    name: 'hexColor',
                    message: 'Enter hex color code (e.g., #FF5733):',
                    validate: (input) => {
                        if (!input.trim()) {
                            return 'Color cannot be empty';
                        }
                        if (!this.isValidHexColor(input.trim())) {
                            return 'Invalid hex color format. Use format like #FF5733 or #f57';
                        }
                        return true;
                    }
                }]);
                config.color = customAnswer.hexColor.trim();
            } else {
                config.color = selectedColorName;
            }
        }

        return config;
    }

    hasAnyFlags(options) {
        return !!(options.ssid || options.password || options.security || 
                 options.hidden || options.style || options.color || options.output);
    }

    mapSecurityType(security) {
        const lowerSecurity = security.toLowerCase();
        switch (lowerSecurity) {
            case 'wpa':
            case 'wpa2':
            case 'wpa3':
                return 'WPA';
            case 'wep':
                return 'WEP';
            case 'open':
            case 'none':
                return 'nopass';
            default:
                return 'WPA';
        }
    }

    mapSecurityFromChoice(choice) {
        if (choice.includes('WPA2/WPA3')) return '';
        if (choice.includes('WPA (Legacy)')) return 'WPA';
        if (choice.includes('WEP')) return 'WEP';
        if (choice.includes('Open')) return 'nopass';
        return '';
    }

    isValidStyle(style) {
        return QRStyles.some(s => s.name === style);
    }

    isValidColor(color) {
        // Check if it's a predefined color name
        if (QRColors.some(c => c.name === color)) {
            return true;
        }
        // Check if it's a valid hex color
        return this.isValidHexColor(color);
    }

    isValidHexColor(hex) {
        // Valid hex color patterns: #RGB, #RRGGBB
        const hexPattern = /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/;
        return hexPattern.test(hex);
    }

    getColorHex(colorName) {
        // If it's already a hex color, return it
        if (this.isValidHexColor(colorName)) {
            return colorName;
        }
        
        // Find the color in predefined colors
        const color = QRColors.find(c => c.name === colorName);
        return color ? color.hex : '#000000'; // Default to black if not found
    }

    generateWiFiQRContent(config) {
        // iOS-specific Wi-Fi QR code format: WIFI:S:<SSID>;T:<WPA|WEP|nopass>;P:<password>;;
        // CRITICAL: Field order matters for iOS! S must come before T
        
        const escapedSSID = this.escapeQRString(config.ssid);
        const escapedPassword = this.escapeQRString(config.password);
        
        let content = `WIFI:S:${escapedSSID};T:${config.security};`;
        
        if (config.security !== 'nopass') {
            content += `P:${escapedPassword};`;
        }
        
        content += ';';
        
        return content;
    }

    escapeQRString(str) {
        if (!str) return '';
        
        return str
            .replace(/\\/g, '\\\\')  // Escape backslashes first
            .replace(/;/g, '\\;')    // Escape semicolons
            .replace(/,/g, '\\,')    // Escape commas
            .replace(/"/g, '\\"')    // Escape quotes
            .replace(/'/g, "\\'")    // Escape single quotes
            .replace(/</g, '\\<')    // Escape less than
            .replace(/>/g, '\\>');   // Escape greater than
    }

    displayDebugInfo(config, qrContent) {
        console.log(chalk.cyan('📋 Debug Information:'));
        console.log(`   SSID: ${config.ssid}`);
        console.log(`   Security: ${config.security || 'Auto'} → ${config.security || 'WPA'} (iOS compatible)`);
        console.log(`   Hidden: ${config.hidden} (hidden field omitted for iOS compatibility)`);
        console.log(`   Style: ${config.style} (${this.getStyleDescription(config.style)})`);
        console.log(`   Color: ${config.color} (${this.getColorHex(config.color)})`);
        console.log(`   QR Content: ${qrContent}`);
        console.log(`   Field Order: ✅ S,T,P (iOS required format)\n`);
    }

    getStyleDescription(styleName) {
        const style = QRStyles.find(s => s.name === styleName);
        return style ? style.description : 'Unknown style';
    }

    displayStyleWarnings(config) {
        if (config.security === 'WEP') {
            console.log(chalk.yellow('⚠️  Note: WEP is deprecated and may not work on modern iOS versions\n'));
        }

        if (config.style === 'circle') {
            console.log(chalk.magenta('✨ Circle style: Square corners for reliability + circular data for aesthetics!\n'));
        }
    }

    displayQRTerminal(content) {
        console.log(chalk.cyan('📟 Displaying QR code in terminal...'));
        console.log(chalk.bold('QR Code:'));
        QRCode.generate(content, { small: true }, (qrString) => {
            console.log(qrString);
        });
    }

    async generateQRFile(content, filename, config) {
        if (!filename.endsWith('.png')) {
            filename += '.png';
        }

        const absolutePath = path.resolve(filename);
        const colorHex = this.getColorHex(config.color);

        const qrOptions = {
            data: content,
            width: 512,
            height: 512,
            backgroundOptions: {
                color: '#ffffff'
            }
        };

        if (config.style === 'circle') {
            // Circle style: square corners + circular data
            qrOptions.dotsOptions = {
                type: 'rounded',
                color: colorHex
            };
            qrOptions.cornersSquareOptions = {
                type: 'square',
                color: colorHex
            };
            qrOptions.cornersDotOptions = {
                type: 'square',
                color: colorHex
            };
        } else {
            // Square style: traditional squares
            qrOptions.dotsOptions = {
                type: 'square',
                color: colorHex
            };
            qrOptions.cornersSquareOptions = {
                type: 'square',
                color: colorHex
            };
            qrOptions.cornersDotOptions = {
                type: 'square',
                color: colorHex
            };
        }

        const qr = new QRCodeCanvas(qrOptions);
        await qr.toFile(absolutePath, 'png');
        
        const colorDisplay = config.color === colorHex ? config.color : `${config.color} (${colorHex})`;
        console.log(chalk.green(`${config.style === 'circle' ? 'Circle' : 'Square'} QR code (${colorDisplay}) saved as: ${absolutePath}`));
    }

    parse(argv) {
        this.program.parse(argv);
    }
}

// Main execution
if (require.main === module) {
    const generator = new WiFiQRGenerator();
    generator.parse(process.argv);
}
