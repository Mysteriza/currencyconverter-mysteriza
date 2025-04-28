# Currency Converter Desklet

A lightweight Cinnamon desklet to display real-time exchange rates for various currencies with a customizable appearance. Built for simplicity and functionality, this desklet fetches the latest exchange rates daily using the ExchangeRate-API.

## Features
- **Multi-Currency Support**: Choose your base and target currencies (e.g., USD to IDR, EUR to JPY) from a list of popular options.
- **Real-Time Updates**: Automatically refreshes exchange rates every 24 hours.
- **Customizable Appearance**:
  - Adjust desklet width, height, and price font size.
  - Set background color, transparency, and border radius.
  - Customize price text color and header text color.
- **Clean Design**: Displays the exchange rate, last updated time (in `DD/MM/YYYY, HH:MM:SS AM/PM` format), and a currency conversion header with a universal exchange icon.
- **Lightweight**: Minimal dependencies, efficient API calls, and optimized for performance.

## Installation
1. **Download the Desklet**:
   - Clone or download this repository.
   - Extract the folder `currencyconverter@mysteriza` to `~/.local/share/cinnamon/desklets/`.
   - Ensure the folder structure is `~/.local/share/cinnamon/desklets/currencyconverter@mysteriza/`.

2. **Install Dependencies**:
   - Ensure you have `libsoup` installed (required for HTTP requests):
     ```bash
     sudo apt-get install libsoup2.4-1
     ```
3. **Add the Desklet**:
   - Open System Settings > Desklets.
   - Find "Currency Converter" in the list and click the "+" button to add it to your desktop.
4. **Configure the Desklet**:
   - Right-click the desklet and select Configure.
   - Enter your ExchangeRate-API key (get one for free at https://www.exchangerate-api.com).
   - Select your base and target currencies (e.g., USD to IDR).
   - Customize the appearance (size, colors, transparency) as desired.
5. **Requirements**:
   - Cinnamon desktop environment (tested on Cinnamon 5.x).
   - Internet connection for fetching exchange rates.
   - An API key from ExchangeRate-API.
   - libsoup library for HTTP requests.
