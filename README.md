# Console Lite

[![Travis](https://img.shields.io/travis/CircuitCoder/Console-Lite.svg?style=flat-square)](https://travis-ci.org/CircuitCoder/Console-Lite)
[![AppVeyor](https://img.shields.io/appveyor/ci/CircuitCoder/console-lite.svg?style=flat-square)](https://ci.appveyor.com/project/CircuitCoder/console-lite)
[![David](https://img.shields.io/david/CircuitCoder/Console-Lite.svg?style=flat-square)](https://david-dm.org/CircuitCoder/Console-Lite)
[![David Dev](https://img.shields.io/david/dev/CircuitCoder/Console-Lite.svg?style=flat-square)](https://david-dm.org/CircuitCoder/Console-Lite)

## Develop

```bash
# Install dependencies
yarn install --frozen-lockfile
yarn rebuildNative # Rebuild native modules for Electron

# Start from source:
yarn start

# Start only the server:
yarn server 
```

To build the executable package, please run the following commands.

```bash
yarn pack
```

If you want to run from source again, you need to reinstall the dev dependencies

## License

All source code within this repository are released under the MIT License. For a detailed license file, please refer to LICENSE.
