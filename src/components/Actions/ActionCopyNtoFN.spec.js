import {createLocalVue} from "@vue/test-utils";
import ActionCopyNtoFN from "./ActionCopyNtoFN";
import ICAL from "ical.js";
import {render, screen} from "@testing-library/vue";
import userEvent from "@testing-library/user-event";

function parseVCard(vCardString) {
	return new ICAL.Component(ICAL.parse(vCardString));
}

describe('ActionCopyNtoFN.vue', () => {
	const localVue = createLocalVue();
	localVue.prototype.t = (t) => t

	it('should copy N to FN when N is available', () => {
		let component = {
			contact: {
				vCard: parseVCard([
					'BEGIN:VCARD',
					'VERSION:4.0',
					'N;CHARSET=UTF-8:Stevenson;John;Philip,Paul;Dr.;Jr.,M.D.,A.C.P.',
					'FN:Philip Paul Richardson',
					'REV:2021-10-22T17:02:27+02:00',
					'END:VCARD',
				].join("\r\n"))
			},
			updateContact: jest.fn()
		};

		render(ActionCopyNtoFN, {
			localVue,
			props: {
				component
			}
		});

		let actionButton = screen.getByRole("button");
		userEvent.click(actionButton);

		expect(component.contact.fullName).toEqual("John Stevenson")
	})

	it('should do nothing, when N is not set', () => {
		let component = {
			contact: {
				vCard: parseVCard([
					'BEGIN:VCARD',
					'VERSION:4.0',
					'FN:Philip Paul Richardson',
					'REV:2021-10-22T17:02:27+02:00',
					'END:VCARD',
				].join("\r\n"))
			},
			updateContact: jest.fn()
		};

		render(ActionCopyNtoFN, {
			localVue,
			props: {
				component
			}
		});

		let actionButton = screen.getByRole("button");
		userEvent.click(actionButton);

		expect(component.contact.fullName).toBeUndefined()
	})
})
