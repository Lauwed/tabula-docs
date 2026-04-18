/** @param {number} b - Size in bytes. @returns {string} Human-readable size string. */
const fmtSize = (b) => {
	if (b < 1024) return `${b}B`;
	if (b < 1048576) return `${(b / 1024).toFixed(1)}KB`;
	return `${(b / 1048576).toFixed(1)}MB`;
};

/** @param {string} name - File name. @returns {string} Uppercase extension (max 4 chars). */
const extOf = (name) => {
	return name.split('.').pop().toUpperCase().slice(0, 4);
};

/**
 * Builds a full drag-and-drop file input widget, including preview thumbnails,
 * a simulated upload progress bar, and a "Clear" action button.
 *
 * @param {string} label - Visible label text above the drop zone.
 * @param {boolean} [multiple=false] - Whether multiple files can be selected.
 * @param {string[]} [accept=["image/*"]] - Accepted MIME types / extensions.
 * @param {number} [maxWeight=5] - Maximum file size in MB, shown in the hint.
 * @param {string|null} [id=null] - Optional id applied to the root wrapper element.
 * @returns {HTMLDivElement & { getFiles: () => File[] }} The fully wired DOM node.
 *   Call `.getFiles()` to retrieve the current file list before form submission.
 */
const getFileFormControl = (
	label,
	multiple = false,
	accept = ['image/*'],
	maxWeight = 5,
	id = null
) => {
	const instanceId = `fi-${Date.now() + Math.random().toString(36).slice(2)}`;

	// --- Root form-control ---
	const wrapper = document.createElement('div');
	wrapper.className = 'form-control form-control--file';
	if (id) wrapper.id = id;

	// --- Label ---
	const labelEl = document.createElement('label');
	labelEl.setAttribute('for', instanceId);
	labelEl.className = 'form-control__label';
	labelEl.textContent = label;
	wrapper.appendChild(labelEl);

	// --- Drop zone ---
	const zone = document.createElement('div');
	zone.className = 'form-control__zone';
	zone.id = `drop-zone-${instanceId}`;

	const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	iconSvg.setAttribute('class', 'form-control__zone__icon');
	iconSvg.setAttribute('viewBox', '0 0 24 24');
	iconSvg.innerHTML = `
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  `;
	zone.appendChild(iconSvg);

	const zoneText = document.createElement('div');

	const dropLabel = document.createElement('p');
	dropLabel.textContent = `Drag and drop ${multiple ? 'files' : 'a file'} here`;
	zoneText.appendChild(dropLabel);

	const helpText = document.createElement('p');
	helpText.className = 'form-control__help';
	helpText.appendChild(document.createTextNode('or '));
	const browseBtn = document.createElement('button');
	browseBtn.type = 'button';
	browseBtn.className = 'form-control__button';
	browseBtn.textContent = 'browse your device files';
	browseBtn.addEventListener('click', (e) => {
		e.stopPropagation();
		input.click();
	});
	helpText.appendChild(browseBtn);
	zoneText.appendChild(helpText);

	const tag = document.createElement('p');
	tag.className = 'tag';
	tag.textContent = `${accept
		.map((s) => s.replace('image/*', 'PNG · JPG · GIF').replace('.', '').toUpperCase())
		.join(' · ')} · Max ${maxWeight} MB`;
	zoneText.appendChild(tag);

	zone.appendChild(zoneText);
	zone.addEventListener('click', () => input.click());
	wrapper.appendChild(zone);

	// --- Hidden file input ---
	const input = document.createElement('input');
	input.type = 'file';
	input.id = instanceId;
	input.accept = accept.join(',');
	input.style.display = 'none';
	if (multiple) input.setAttribute('multiple', '');
	wrapper.appendChild(input);

	// --- Previews ---
	const previewsEl = document.createElement('div');
	previewsEl.className = 'previews';
	wrapper.appendChild(previewsEl);

	// --- Actions ---
	const actionsEl = document.createElement('div');
	actionsEl.className = 'actions';
	actionsEl.style.display = 'none';

	const clearBtn = document.createElement('button');
	clearBtn.type = 'button';
	clearBtn.className = 'btn';
	clearBtn.textContent = 'Clear';
	clearBtn.addEventListener('click', clearAll);
	actionsEl.appendChild(clearBtn);

	wrapper.appendChild(actionsEl);

	// --- State & logic ---
	let files = [];

	zone.addEventListener('dragover', (e) => {
		e.preventDefault();
		zone.classList.add('over');
	});
	zone.addEventListener('dragleave', () => zone.classList.remove('over'));
	zone.addEventListener('drop', (e) => {
		e.preventDefault();
		zone.classList.remove('over');
		addFiles([...e.dataTransfer.files]);
	});
	input.addEventListener('change', () => addFiles([...input.files]));

	function addFiles(newFiles) {
		if (!multiple) {
			clearAll();
			newFiles = newFiles.slice(0, 1);
		}
		newFiles.forEach((f) => {
			if (files.find((x) => x.file.name === f.name && x.file.size === f.size)) return;
			const id = `f${Date.now() + Math.random().toString(36).slice(2)}`;
			files.push({ id, file: f, pct: 0, done: false });
			renderFile(id, f);
			simulate(id);
		});
		input.value = '';
		actionsEl.style.display = files.length ? 'flex' : 'none';
	}

	function renderFile(id, f) {
		const row = document.createElement('div');
		row.className = 'preview';
		row.id = `preview-${id}`;
		const isImg = f.type.startsWith('image/');

		const thumb = document.createElement('div');
		thumb.className = 'preview__thumb';
		thumb.id = `preview-thumb-${id}`;
		if (!isImg) {
			const ext = document.createElement('span');
			ext.textContent = extOf(f.name);
			thumb.appendChild(ext);
		}

		const info = document.createElement('div');
		info.className = 'preview__info';

		const description = document.createElement('div');
		description.className = 'preview__description';

		const name = document.createElement('div');
		name.className = 'preview__name';
		name.textContent = f.name;

		const meta = document.createElement('div');
		meta.className = 'preview__meta';
		meta.textContent = `${fmtSize(f.size)} · ${f.type || 'file'}`;

		description.appendChild(name);
		description.appendChild(meta);

		const status = document.createElement('div');
		status.className = 'preview__status';

		const bar = document.createElement('div');
		bar.className = 'preview__status__bar';
		const fill = document.createElement('div');
		fill.className = 'preview__status__fill';
		fill.id = `fill-${id}`;
		fill.style.width = '0%';
		bar.appendChild(fill);

		const pct = document.createElement('p');
		pct.className = 'preview__status__pct';
		pct.id = `pct-${id}`;
		pct.textContent = '0%';

		status.appendChild(bar);
		status.appendChild(pct);

		info.appendChild(description);
		info.appendChild(status);

		const deleteBtn = document.createElement('button');
		deleteBtn.type = 'button';
		deleteBtn.className = 'preview__delete';
		deleteBtn.innerHTML = `<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
		deleteBtn.addEventListener('click', () => removeFile(id));

		row.appendChild(thumb);
		row.appendChild(info);
		row.appendChild(deleteBtn);
		previewsEl.appendChild(row);

		if (isImg) {
			const r = new FileReader();
			r.onload = (e) => {
				const t = document.getElementById(`preview-thumb-${id}`);
				if (!t) return;
				const img = document.createElement('img');
				img.className = 'preview__image';
				img.src = e.target.result;
				img.alt = '';
				t.innerHTML = '';
				t.appendChild(img);
			};
			r.readAsDataURL(f);
		}
	}

	function simulate(id) {
		let p = 0;
		const iv = setInterval(() => {
			p += Math.random() * 18 + 4;
			if (p >= 100) {
				p = 100;
				clearInterval(iv);
				markDone(id);
			}
			const fill = document.getElementById(`fill-${id}`);
			const pct = document.getElementById(`pct-${id}`);
			if (fill) fill.style.width = `${Math.round(p)}%`;
			if (pct) pct.textContent = `${Math.round(p)}%`;
		}, 120);
	}

	function markDone(id) {
		const row = document.getElementById(`preview-${id}`);
		if (!row) return;
		const doneContainer = document.createElement('div');
		doneContainer.className = 'preview__done';
		const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="preview__done__svg"><path d="M20 6 9 17l-5-5"/></svg>`;
		const svg = new DOMParser().parseFromString(svgString, 'text/xml').querySelector('svg');
		doneContainer.appendChild(svg);
		const text = document.createElement('p');
		text.className = 'preview__done__text';
		text.textContent = 'Done';
		doneContainer.appendChild(text);
		row.querySelector('.preview__description').after(doneContainer);
		const obj = files.find((x) => x.id === id);
		if (obj) obj.done = true;
	}

	function removeFile(id) {
		files = files.filter((x) => x.id !== id);
		const row = document.getElementById(`preview-${id}`);
		if (row) {
			row.style.opacity = '0';
			row.style.transform = 'translateY(-4px)';
			row.style.transition = 'all .2s';
			setTimeout(() => row.remove(), 200);
		}
		setTimeout(() => {
			actionsEl.style.display = files.length ? 'flex' : 'none';
		}, 250);
	}

	function clearAll() {
		files = [];
		previewsEl.innerHTML = '';
		actionsEl.style.display = 'none';
	}

	wrapper.getFiles = () => files.map((x) => x.file);

	return wrapper;
};

/**
 * Builds a generic form control element (input, textarea, select, or file
 * drop zone) wrapped in a labelled `.form-control` container.
 *
 * @param {string} label - HTML string used as the label (may contain tags like `<span>`).
 * @param {object} inputOpts - Configuration options for the input element.
 * @param {string} inputOpts.id - The `id` applied to the input and linked from the label.
 * @param {"text"|"number"|"checkbox"|"radio"|"textarea"|"select"|"file"} [inputOpts.type="text"]
 * @param {*} [inputOpts.defaultValue] - Pre-filled value (or `checked` state for checkbox/radio).
 * @param {string} [inputOpts.placeholder]
 * @param {number} [inputOpts.min] - Numeric minimum (applied to `<input type="number">`).
 * @param {number} [inputOpts.max] - Numeric maximum.
 * @param {Function} [inputOpts.onChange] - `change` event handler.
 * @param {boolean} [inputOpts.required]
 * @param {Array<{name: string, label: string}>} [inputOpts.options] - Options for `select` type.
 * @param {boolean} [inputOpts.multiple] - Whether multiple files can be selected (file type only).
 * @param {string[]} [inputOpts.accept] - Accepted MIME types (file type only).
 * @param {number} [inputOpts.maxWeight] - Max file size in MB shown in hint (file type only).
 * @param {string|null} [help=null] - Optional HTML help text rendered below the label.
 * @returns {HTMLDivElement} The fully wired `.form-control` DOM node.
 */
const getFormControl = (label, inputOpts, help = null) => {
	let {
		id,
		defaultValue,
		placeholder,
		type,
		min,
		max,
		onChange,
		required,
		options,
		multiple,
		accept,
		maxWeight,
	} = inputOpts;

	if (type === undefined) {
		type = 'text';
	} else if (type === 'file') {
		return getFileFormControl(label, multiple, accept, maxWeight, id);
	}

	const container = document.createElement('div');
	container.classList.add('form-control');

	const labelNode = document.createElement('label');
	labelNode.classList.add('form-control__label');
	labelNode.innerHTML = label;
	labelNode.setAttribute('for', id);
	container.appendChild(labelNode);

	let input;
	if (type === 'textarea') {
		input = document.createElement('textarea');
		input.innerHTML = defaultValue;
		if (required !== undefined && required === true) input.setAttribute('required', 'true');
	} else if (type === 'select') {
		input = document.createElement('select');

		if (options !== undefined && options.length > 0) {
			options.forEach((o) => {
				const option = document.createElement('option');
				option.value = o.name;
				option.innerHTML = o.label;

				input.appendChild(option);
			});
		} else {
			input.innerHTML = '<option name="null">No option available</option>';
		}
	} else {
		input = document.createElement('input');
		input.type = type;
		if (min !== undefined) input.setAttribute('min', min);
		if (max !== undefined) input.setAttribute('max', max);
		if (required !== undefined && required === true) input.setAttribute('required', 'true');
		if (placeholder !== undefined) input.setAttribute('placeholder', placeholder);
		if (defaultValue !== undefined) {
			if (type === 'checkbox' || type === 'radio') input.checked = defaultValue;
			else input.value = defaultValue;
		}
	}

	input.id = id;
	input.classList.add('form-control__input');
	if (onChange !== undefined) {
		input.addEventListener('change', onChange);
	}

	if (help && help.length > 0) {
		const helpNode = document.createElement('p');
		helpNode.classList.add('form-control__help');
		helpNode.innerHTML = help;

		container.appendChild(helpNode);
	}

	container.appendChild(input);

	return container;
};
