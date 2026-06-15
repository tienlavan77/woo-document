import buildTag from './buildtag.min.mjs';

const Editor = function () {
	let e = this;
	/* config: {
			enterToUpdate: true/false,
			focusoutToUpdate: true/false,
			onfocusin: xử lý nội dung trước khi thay đổi
			update: () => {} // hàm callback update theo yêu cầu
			getUpdate = () => { } // trả về nội dung của khu vực edit 
		}*/
	e.init = ({ template, className, config }) => {
		// trả về mảng dữ liệu thu thập theo
		if (! template) return;
		// tạo 1 dom object
		let templateDOM = buildTag({
			tag: "div",
			innerHTML: template,
		});
		
		// lấy các phần tử trong templateDOM bằng className
		let elementsObject = templateDOM.querySelectorAll(`.${className}`) || [];
		let elements = Array.from(elementsObject).map((element) => {
			let id = element.id || e.getUpdate(6);
			Object.assign(element, {
			id,
			contentEditable: true,
			...config?.processEvent,
			});
			return {
				id,
				content: element.textContent,
				changed: false,
			};
		});
		return {
			template: templateDOM.innerHTML, //dùng lưu vào local storage
			templateDOM: templateDOM.children[0], // dùng trực tiếp hiển thị
			elements, // mảng các phần tử đã được thêm id bao gồm { id, content}
		};
	};
	e.getUpdate = (length) => {
		// trả về dữ liệu được nhập
		let randomString = "";
		let characters = "abcdefghijklmnopqrstuvwxyz";
		let chrLength = characters.length;
		for (var i = 0; i < length; i++) {
			randomString += characters.charAt(Math.floor(Math.random() * chrLength));
		}
		return randomString;
	};

	//tạo random id
	e.randomId = () => {};
};

export default Editor;
