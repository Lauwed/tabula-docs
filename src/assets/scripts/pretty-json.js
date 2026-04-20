const prettyPrintJson = (() => {
	const escape = (s) =>
		String(s)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;');

	const urlRe = /^https?:\/\/[^\s"]+$/;

	const tokenize = (value) => {
		if (value === null) return `<span class="json-null">null</span>`;
		if (typeof value === 'boolean') return `<span class="json-boolean">${value}</span>`;
		if (typeof value === 'number') return `<span class="json-number">${value}</span>`;
		if (typeof value === 'string') {
			const esc = escape(value);
			const inner = urlRe.test(value)
				? `<a class="json-link" href="${esc}" target="_blank" rel="noopener noreferrer">${esc}</a>`
				: esc;
			return `<span class="json-string">&quot;${inner}&quot;</span>`;
		}
		return escape(String(value));
	};

	const lines = [];

	const walk = (node, indent) => {
		const pad = '  '.repeat(indent);
		const padClose = '  '.repeat(indent - 1);

		if (Array.isArray(node)) {
			if (node.length === 0) {
				lines.push(`<span class="json-mark">[]</span>`);
				return;
			}
			lines[lines.length - 1] += `<span class="json-mark">[</span>`;
			node.forEach((item, i) => {
				lines.push(pad);
				walk(item, indent + 1);
				if (i < node.length - 1) lines[lines.length - 1] += `<span class="json-mark">,</span>`;
			});
			lines.push(`${padClose}<span class="json-mark">]</span>`);
		} else if (node !== null && typeof node === 'object') {
			const keys = Object.keys(node);
			if (keys.length === 0) {
				lines.push(`<span class="json-mark">{}</span>`);
				return;
			}
			lines[lines.length - 1] += `<span class="json-mark">{</span>`;
			keys.forEach((k, i) => {
				lines.push(
					`${pad}<span class="json-key">&quot;${escape(k)}&quot;</span><span class="json-mark">: </span>`
				);
				walk(node[k], indent + 1);
				if (i < keys.length - 1) lines[lines.length - 1] += `<span class="json-mark">,</span>`;
			});
			lines.push(`${padClose}<span class="json-mark">}</span>`);
		} else {
			lines[lines.length - 1] += tokenize(node);
		}
	};

	const toHtml = (value) => {
		lines.length = 0;
		lines.push('');
		walk(value, 1);
		return `<ol class="json-lines json-container">${lines.map((l) => `<li>${l}</li>`).join('')}</ol>`;
	};

	return { toHtml };
})();
