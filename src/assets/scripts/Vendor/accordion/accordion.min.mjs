import createFormItem, { isNodeDOM } from "../helpers/formgroup.min.mjs";

const Accordion = function () {
	let acc = this;

	// chạy khởi tạo 1 collapse
	acc.init = ({ id, ...items }) => {
		let accordion = document.querySelector(`#${id}`);
		if (accordion) acc.collectAccordion({ id, ...items });
		else accordion = acc.createAccordion({ id, ...items });
		return accordion;
	};

	//thu thập các thông tin khi người dùng tạo ra sẳn accordion
	acc.collectAccordion = ({ id, onlyAccordionOpen, ...item }) => {
		let accordion = document.querySelector(`#${id}`);
		let titles = accordion.querySelectorAll(".accordion__control");
		let activeItems = accordion.querySelectorAll(".accordion__item.active");
		if (titles)
			Array.from(titles).map((title) => {
			let btnClass = title.classList[0];
			title.onclick = (e) =>
				acc.openAccordionItem({ e, onlyAccordionOpen, btnClass });
			});
		if (activeItems)
			Array.from(activeItems).map((activeItems) => {
				let itemContent = activeItems.querySelector(".accordion__content");

				itemContent.style.maxHeight =
					acc.getHeightChildrenInContent({ itemContent }) + "px";
			});
	}; 

	acc.createAccordion = ({ id, ...items }) => {
		return createFormItem({
			tag: "div",
			className: "accordion",
			id: id || "",
			children: [...acc.createAccordionChilren(items)],
		});
	};

	acc.createAccordionChilren = ({
		arrowButton,
		onlyAccordionOpen,
		accordions,
	}) => {
		if (!accordions) return [];
		return accordions.map(({ idAccordion, title, content }, index) =>
			createFormItem({
				tag: "div",
				className: `accordion__item ${index === 0 ? "active" : ""}`,
				id: idAccordion || "",
				children: [
					{
						tag: "h4",
						className: "accordion__heading",
						append: acc.createHeading({
							idAccordion,
							title,
							arrowButton,
							onlyAccordionOpen,
						}),
						target: idAccordion,
					},
					{
						tag: "div",
						className: `accordion__content`,
						...acc.createAccordionContent({ content }),
					},
				],
			})
		);
	};
	acc.createHeading = ({ title, arrowButton, onlyAccordionOpen }) => {
		let titleIn = title || "Not a title";
		let buttonInner = !arrowButton || arrowButton === false ? "" : "";

		let slideUpButton =
			buttonInner != ""
			? createFormItem({
					tag: "span",
					className: "accordion__button",
					innerHTML: buttonInner,
					onclick: (e) =>
					acc.openAccordionItem({
						e,
						onlyAccordionOpen,
						btnClass: "accordion__heading",
					}),
				})
			: "";
		let heading = createFormItem({
			tag: "span",
			className: "accordion__title",
			innerHTML: titleIn,
			onclick: (e) =>
			acc.openAccordionItem({
				e,
				onlyAccordionOpen,
				btnClass: "accordion__heading",
			}),
		});
		return [heading, slideUpButton];
	};

	acc.openAccordionItem = ({ e, onlyAccordionOpen, btnClass }) => {
		e.preventDefault();
		let exactlyBtn = acc.getExactlyButton({ e, btnClass });
		let target = exactlyBtn.parentElement.target;
		let accordion = document.querySelector(`#${target}`);
		let currentActive = accordion.className.indexOf("active");
		let currentContent = accordion.querySelector(".accordion__content");
		// currentActive !== -1 là
		if (currentActive !== -1) {
			currentContent.style.maxHeight = null;
		} else {
			if (onlyAccordionOpen && onlyAccordionOpen === true) {
			let lsAcc = document.querySelectorAll(".accordion__item");
			let activeItem = Array.from(lsAcc).find(
				(item) => item.className.indexOf("active") !== -1
			);

			if (activeItem) {
				activeItem.classList.remove("active");
				activeItem.querySelector(".accordion__content").style.maxHeight =
					null;
			}
			}
			currentContent.style.maxHeight =
			acc.getHeightChildrenInContent({ itemContent: currentContent }) + "px";
		}
		accordion.classList.toggle("active");
	};

	acc.getExactlyButton = ({ e, btnClass }) => e.target.closest(`.${btnClass}`);

	acc.createAccordionContent = ({ content }) =>
		isNodeDOM(content) ? { append: content } : { innerHTML: content };

	acc.getHeightChildrenInContent = ({ itemContent }) =>
		itemContent.children.length == 0
			? 0
			: Array.from(itemContent.children)
				.map((child) => child.clientHeight)
				.reduce((acc, cur) => acc + cur, 0);

	return acc;
};

export default Accordion;
