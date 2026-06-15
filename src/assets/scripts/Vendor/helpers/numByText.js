export default class VietnameseNumberReader {
	// Bản đồ ánh xạ số thành chữ
	static TEXT_MAP = {
		0: "",
		10: "không",
		20: "lẻ",
		1: "một",
		21: "mốt",
		2: "hai",
		3: "ba",
		4: "bốn",
		5: "năm",
		15: "lăm",
		6: "sáu",
		7: "bảy",
		8: "tám",
		9: "chín",
	};

	// Đơn vị hàng lớn
	static LARGE_UNITS = ["", "ngàn,", "triệu,", "tỷ,"];

	/**
		* Phương thức chính để chuyển đổi
		* @param {number} value - Giá trị số cần chuyển
		*/
	static read(value) {
		if (value === 0) return "không";
		
		const result = this._translate(value);
		// Đảo ngược mảng vì quá trình đệ quy xử lý từ hàng đơn vị lên
		let fullText = result.reverse().join(" ").trim();
		// Xử lý viết hoa chữ cái đầu tiên
		if (fullText.length > 0) {
			fullText = fullText.charAt(0).toUpperCase() + fullText.slice(1);
		}
		if (fullText.endsWith(',')) {
			fullText = fullText.slice(0, -1);
		 }
		 
		return fullText;
		// bytext.filter((bt) => bt != "").map((bt) => bt.trim());
	}

	/**
		* Hàm đệ quy xử lý từng chữ số
		*/
	static _translate(value, position = 0, words = []) {
		const newValue = Math.floor(value / 10);
		const surplus = value % 10;

		const posOfGroup = position % 3;
		let text = "";

		// Xử lý dựa trên vị trí hàng đơn vị, chục, hay trăm
		switch (posOfGroup) {
			case 0:
			text = this._processUnit(newValue, surplus, position);
			break;
			case 1:
			text = this._processDozens(surplus, position, words);
			break;
			case 2:
			text = this._processHundreds(surplus, position, words);
			break;
		}

		words.push(text);

		if (newValue > 0) {
			return this._translate(newValue, position + 1, words);
		}

		return words.filter((w) => w !== "").map((w) => w.trim());
	}

	// Xử lý hàng đơn vị
	static _processUnit(newValue, surplus, position) {
		let text = "";
		if (surplus !== 1 && surplus !== 5) {
			text = this.TEXT_MAP[surplus];
		} else {
			if (surplus === 1) {
			const isGreaterThanTen = (newValue % 10) > 1;
			text = this.TEXT_MAP[isGreaterThanTen ? "21" : "1"];
			} else if (surplus === 5) {
			const hasDozens = (newValue % 10) > 0;
			text = this.TEXT_MAP[hasDozens ? "15" : "5"];
			}
		}
		
		if (surplus !== 0) text += ` ${this._getLargeUnit(position)}`;
		return text;
	}

	// Xử lý hàng chục
	static _processDozens(surplus, position, words) {
		let text = "";
		if (surplus === 0) {
			text = words[position - 1] === "" ? "" : this.TEXT_MAP["20"];
		} else if (surplus === 1) {
			text = "mười";
		} else {
			text = `${this.TEXT_MAP[surplus]} mươi`;
		}

		if (surplus !== 0 && words[position - 1] === "") {
			text += ` ${this._getLargeUnit(position)}`;
		}
		return text;
	}

	// Xử lý hàng trăm
	static _processHundreds(surplus, position, words) {
		let text = "";
		if (surplus !== 0) {
			text = `${this.TEXT_MAP[surplus]} trăm`;
		} else {
			text = words[position - 1] !== "" ? `${this.TEXT_MAP["10"]} trăm` : "";
		}

		if (surplus !== 0 && words[position - 1] === "" && words[position - 2] === "") {
			text += ` ${this._getLargeUnit(position)}`;
		}
		return text;
	}

	static _getLargeUnit(position) {
		return this.LARGE_UNITS[Math.floor(position / 3)] || "";
	}
}
