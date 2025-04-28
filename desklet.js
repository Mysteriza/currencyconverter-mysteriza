const Desklet = imports.ui.desklet;
const St = imports.gi.St;
const Soup = imports.gi.Soup;
const ByteArray = imports.byteArray;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const Settings = imports.ui.settings;
const Gio = imports.gi.Gio;

const UUID = "currencyconverter@mysteriza";
const DESKLET_ROOT = imports.ui.deskletManager.deskletMeta[UUID].path;
const API_BASE_URL = "https://openexchangerates.org/api";
const DEFAULT_WIDTH = 210;
const DEFAULT_HEIGHT = 105;
const DEFAULT_PRICE_FONT_SIZE = 25;
const PADDING = 10;
const ICON_SIZE = 32;
const FONT_SIZE_CONTAINER = 14;
const FONT_SIZE_HEADER = 16;
const FONT_SIZE_SUBHEADER = 12;
const FONT_SIZE_LAST_UPDATED = 10;

let httpSession;
if (Soup.MAJOR_VERSION === 2) {
  httpSession = new Soup.SessionAsync();
  Soup.Session.prototype.add_feature.call(
    httpSession,
    new Soup.ProxyResolverDefault()
  );
} else {
  httpSession = new Soup.Session();
}

function CurrencyTicker(metadata, desklet_id) {
  this._init(metadata, desklet_id);
}

CurrencyTicker.prototype = {
  __proto__: Desklet.Desklet.prototype,

  container: null,
  mainloop: null,
  priceLabel: null,
  lastUpdatedLabel: null,
  isFetching: false,

  _init: function (metadata, desklet_id) {
    try {
      Desklet.Desklet.prototype._init.call(this, metadata, desklet_id);

      this.settings = new Settings.DeskletSettings(
        this,
        this.metadata.uuid,
        desklet_id
      );
      this.settings.bind("apiKey", "cfgApiKey", this.onSettingsChanged);
      this.settings.bind(
        "baseCurrency",
        "cfgBaseCurrency",
        this.onSettingsChanged
      );
      this.settings.bind(
        "targetCurrency",
        "cfgTargetCurrency",
        this.onSettingsChanged
      );
      this.settings.bind(
        "refreshInterval",
        "cfgRefreshInterval",
        this.onSettingsChanged
      );
      this.settings.bind("width", "cfgWidth", this.onUISettingsChanged);
      this.settings.bind("height", "cfgHeight", this.onUISettingsChanged);
      this.settings.bind("bgColor", "cfgBgColor", this.onUISettingsChanged);
      this.settings.bind(
        "bgBorderRadius",
        "cfgBgBorderRadius",
        this.onUISettingsChanged
      );
      this.settings.bind(
        "transparency",
        "cfgTransparency",
        this.onUISettingsChanged
      );
      this.settings.bind(
        "priceFontSize",
        "cfgPriceFontSize",
        this.onUISettingsChanged
      );
      this.settings.bind(
        "priceTextColor",
        "cfgPriceTextColor",
        this.onUISettingsChanged
      );
      this.settings.bind(
        "headerTextColor",
        "cfgHeaderTextColor",
        this.onUISettingsChanged
      );

      this.setHeader(
        `${this.cfgBaseCurrency || "USD"} to ${this.cfgTargetCurrency || "IDR"}`
      );
      this.cfgApiKey = this.cfgApiKey || "";
      this.cfgBaseCurrency = this.cfgBaseCurrency || "USD";
      this.cfgTargetCurrency = this.cfgTargetCurrency || "IDR";
      this.cfgRefreshInterval = this.cfgRefreshInterval || 1440; // Default 24 hours in minutes
      this.cfgWidth = this.cfgWidth || DEFAULT_WIDTH;
      this.cfgHeight = this.cfgHeight || DEFAULT_HEIGHT;
      this.cfgBgColor = this.cfgBgColor || "#303030";
      this.cfgBgBorderRadius = this.cfgBgBorderRadius || 10;
      this.cfgTransparency = this.cfgTransparency || 100;
      this.cfgPriceFontSize = this.cfgPriceFontSize || DEFAULT_PRICE_FONT_SIZE;
      this.cfgPriceTextColor = this.cfgPriceTextColor || "#f9a7b5";
      this.cfgHeaderTextColor = this.cfgHeaderTextColor || "#73c4ff";

      this.setupMenu();
      this.fetchData(true);
    } catch (e) {
      this.showError("Failed to initialize desklet");
    }
  },

  setupMenu: function () {
    this._menu.addAction(
      "Refresh",
      Lang.bind(this, function () {
        this.fetchData(true); // Fetch data immediately on manual refresh
      })
    );
  },

  on_desklet_removed: function () {
    if (this.mainloop) {
      Mainloop.source_remove(this.mainloop);
    }
    if (this.container) {
      this.container.destroy_all_children();
      this.container.destroy();
    }
  },

  onSettingsChanged: function () {
    this.setHeader(`${this.cfgBaseCurrency} to ${this.cfgTargetCurrency}`);
    this.fetchData(true);
  },

  onUISettingsChanged: function () {
    if (this.container) {
      this.setContainerStyle(this.container);
      if (this.priceLabel) {
        this.priceLabel.set_style(
          `font-size: ${this.cfgPriceFontSize}px; color: ${this.cfgPriceTextColor};`
        );
      }
    }
  },

  showLoading: function () {
    this.container = new St.BoxLayout({
      vertical: true,
      style_class: "container",
    });
    this.setContainerStyle(this.container);
    const label = new St.Label({ style_class: "loading" });
    label.set_text("Loading data...");
    this.container.add(label);
    this.setContent(this.container);
  },

  showError: function (message) {
    this.container = new St.BoxLayout({
      vertical: true,
      style_class: "container",
    });
    this.setContainerStyle(this.container);
    const label = new St.Label({ style_class: "error" });
    label.set_text(message || "Failed to load data");
    this.container.add(label);
    this.setContent(this.container);
  },

  fetchData: function (initUI = false) {
    if (this.isFetching) return;
    this.isFetching = true;

    if (!this.cfgApiKey) {
      this.showError("App ID is not set");
      this.isFetching = false;
      return;
    }

    if (initUI) {
      this.showLoading();
    }

    const apiUrl = `${API_BASE_URL}/latest.json?app_id=${this.cfgApiKey}`;
    const message = Soup.Message.new("GET", apiUrl);

    if (Soup.MAJOR_VERSION === 2) {
      httpSession.queue_message(
        message,
        Lang.bind(this, function (session, response) {
          this.handleResponse(response, initUI);
        })
      );
    } else {
      httpSession.send_and_read_async(
        message,
        Soup.MessagePriority.NORMAL,
        null,
        Lang.bind(this, function (session, response) {
          this.handleResponse(message, initUI, response);
        })
      );
    }

    if (this.mainloop) {
      Mainloop.source_remove(this.mainloop);
    }
    // Schedule the next fetch based on the user-selected interval
    this.mainloop = Mainloop.timeout_add_seconds(
      this.cfgRefreshInterval * 60,
      Lang.bind(this, this.fetchData)
    );
  },

  handleResponse: function (response, initUI, asyncResponse = null) {
    try {
      this.isFetching = false;
      let data;
      if (Soup.MAJOR_VERSION === 2) {
        if (response.status_code !== Soup.KnownStatusCode.OK) {
          this.showError("Failed to fetch data: " + response.reason_phrase);
          return;
        }
        data = response.response_body.data;
      } else {
        if (response.get_status() !== Soup.Status.OK) {
          this.showError(
            "Failed to fetch data: " + response.get_reason_phrase()
          );
          return;
        }
        const bytes = httpSession.send_and_read_finish(asyncResponse);
        data = ByteArray.toString(bytes.get_data());
      }
      this.processData(data, initUI);
    } catch (e) {
      this.isFetching = false;
      this.showError("Failed to handle response");
    }
  },

  processData: function (data, initUI) {
    try {
      const parsedData = JSON.parse(data);
      if (!parsedData.rates || !parsedData.rates[this.cfgTargetCurrency]) {
        this.showError(`Exchange rate for ${this.cfgTargetCurrency} not found`);
        return;
      }
      const rate = parsedData.rates[this.cfgTargetCurrency];
      const lastUpdated = new Date(parsedData.timestamp * 1000);
      if (initUI) {
        this.setupUI(rate, lastUpdated);
      } else {
        this.updateUI(rate, lastUpdated);
      }
    } catch (e) {
      this.showError("Failed to process data");
    }
  },

  setupUI: function (rate, lastUpdated) {
    try {
      this.container = new St.BoxLayout({
        vertical: true,
        style_class: "container",
      });
      this.setContainerStyle(this.container);
      this.container.add(this.addHeader());
      this.container.add(this.addPrice(rate));
      this.container.add(this.addLastUpdated(lastUpdated));
      this.setContent(this.container);
    } catch (e) {
      this.showError("Failed to setup UI");
    }
  },

  updateUI: function (rate, lastUpdated) {
    if (this.priceLabel && this.lastUpdatedLabel) {
      this.priceLabel.set_text(this.getFormattedPrice(rate));
      this.lastUpdatedLabel.set_text(this.getFormattedDate(lastUpdated));
    } else {
      this.setupUI(rate, lastUpdated);
    }
  },

  addHeader: function () {
    const row = new St.BoxLayout({
      vertical: false,
      style_class: "row header-row",
    });
    const left = new St.BoxLayout({
      vertical: true,
      style_class: "containerLeft",
    });
    const right = new St.BoxLayout({
      vertical: true,
      style_class: "containerRight",
    });

    try {
      const file = Gio.file_new_for_path(
        DESKLET_ROOT + "/images/icons/currency_exchange.png"
      );
      if (file.query_exists(null)) {
        const gicon = new Gio.FileIcon({ file: file });
        const image = new St.Icon({
          gicon: gicon,
          icon_size: ICON_SIZE,
          icon_type: St.IconType.FULLCOLOR,
          style_class: "icon",
        });
        left.add(image);
      }
    } catch (e) {
      // Skip icon if failed
    }

    const headerLabel = new St.Label({ style_class: "header" });
    headerLabel.set_style(
      `font-size: ${FONT_SIZE_HEADER}px; color: ${this.cfgHeaderTextColor};`
    );
    headerLabel.set_text(
      `${this.cfgBaseCurrency} to ${this.cfgTargetCurrency}`
    );
    right.add(headerLabel);

    const subheaderLabel = new St.Label({ style_class: "subheader" });
    subheaderLabel.set_style(
      `font-size: ${FONT_SIZE_SUBHEADER}px; color: ${this.cfgHeaderTextColor};`
    );
    subheaderLabel.set_text("Currency Conversion");
    right.add(subheaderLabel);

    row.add(left);
    row.add(right);
    return row;
  },

  addPrice: function (price) {
    const row = new St.BoxLayout({
      vertical: false,
      width: this.cfgWidth - PADDING,
      style_class: "row price-row",
    });
    const center = new St.BoxLayout({
      vertical: true,
      width: this.cfgWidth - PADDING,
      style_class: "containerPrice",
    });

    this.priceLabel = new St.Label();
    this.priceLabel.set_style(
      `font-size: ${this.cfgPriceFontSize}px; color: ${this.cfgPriceTextColor};`
    );
    this.priceLabel.set_text(this.getFormattedPrice(price));
    center.add(this.priceLabel);

    row.add(center);
    return row;
  },

  addLastUpdated: function (date) {
    const row = new St.BoxLayout({
      vertical: false,
      width: this.cfgWidth - PADDING,
      style_class: "row",
    });
    const center = new St.BoxLayout({
      vertical: true,
      width: this.cfgWidth - PADDING,
      style_class: "lastUpdated",
    });
    center.set_style(`font-size: ${FONT_SIZE_LAST_UPDATED}px;`);
    this.lastUpdatedLabel = new St.Label();
    this.lastUpdatedLabel.set_text(this.getFormattedDate(date));
    center.add(this.lastUpdatedLabel);
    row.add(center);
    return row;
  },

  getFormattedPrice: function (price) {
    return parseFloat(price).toLocaleString("id-ID", {
      style: "currency",
      currency: this.cfgTargetCurrency,
      minimumFractionDigits: 0,
    });
  },

  getFormattedDate: function (utcDate) {
    try {
      const date = new Date(utcDate);
      const datePart = date
        .toLocaleString("id-ID", {
          timeZone: "Asia/Jakarta",
          dateStyle: "short",
        })
        .replace(/\./g, "/");
      const timePart = date.toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
        timeStyle: "medium",
        hour12: true,
      });
      return `${datePart}, ${timePart}`;
    } catch (e) {
      return "Invalid Date";
    }
  },

  setContainerStyle: function (container) {
    const alpha = this.cfgTransparency / 100;
    const rgb = this.hexToRgb(this.cfgBgColor);
    container.set_style(
      `font-size: ${FONT_SIZE_CONTAINER}px; ` +
        `background-color: rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha}); ` +
        `border-radius: ${this.cfgBgBorderRadius}px; ` +
        `width: ${this.cfgWidth}px; ` +
        `height: ${this.cfgHeight}px;`
    );
  },

  hexToRgb: function (hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  },
};

function main(metadata, desklet_id) {
  return new CurrencyTicker(metadata, desklet_id);
}
