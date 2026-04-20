let expandAllButton, collapseAllButton;
let authContainer, errorAuth;
let token;
let apiBaseUrl = '/api';

window.addEventListener('load', async () => {
	const res = await fetch(`./api.json?v=${Date.now()}`);
	const data = await res.json();

	if (data.settings) applySettings(data.settings);

	const apiContainer = document.querySelector('#main');
	authContainer = apiContainer.querySelector('#auth');
	const endpointsContainer = apiContainer.querySelector('#endpoints');

	token = sessionStorage.getItem('token');
	// Init auth area
	displayAuthForm(authContainer);

	// Init endpoints
	const tables = generateTablesEndpoints(data);
	appendCategories(endpointsContainer, tables);

	expandAllButton = document.querySelector('button#expand-all');
	expandAllButton.addEventListener('click', handleExpandAll);
	collapseAllButton = document.querySelector('button#collapse-all');
	collapseAllButton.addEventListener('click', handleCollapseAll);
});

const displayAuthForm = () => {
	const isUserLogged = token && token.length > 0;

	const title = '<h2 class="auth__title">Authentication</h2>';
	const authForm = `<form action="" method="" class="auth__form">
				<label for="token">Token</label>
				<input id="token" required />
				<button type="submit">Login</button>
			</form>`;
	const logoutButton = '<button>Log out</button>';

	authContainer.innerHTML = title;

	if (!isUserLogged) {
		authContainer.innerHTML += authForm;

		const authFormNode = authContainer.querySelector('form');
		errorAuth = document.createElement('p');
		errorAuth.classList.add('auth__error', 'alert', 'alert--danger');
		authFormNode.appendChild(errorAuth);

		authFormNode.addEventListener('submit', handleAuthFormSubmit);
	} else {
		authContainer.innerHTML += logoutButton;

		const logoutButtonNode = authContainer.querySelector('button');
		logoutButtonNode.addEventListener('click', handleClickLogout);
	}
};

const handleClickLogout = () => {
	sessionStorage.removeItem('token');
	token = null;
	displayAuthForm();
};

const handleAuthFormSubmit = (e) => {
	e.preventDefault();

	errorAuth.innerHTML = '';
	token = e.target.querySelector('input').value;

	if (token && token.length > 0) {
		sessionStorage.setItem('token', token);
		displayAuthForm();
	} else {
		errorAuth.innerHTML = 'Please provide a token.';
	}
};

const handleExpandAll = () => {
	document.querySelectorAll('details').forEach((d) => {
		d.setAttribute('open', true);
	});
};

const handleCollapseAll = () => {
	document.querySelectorAll('details').forEach((d) => {
		d.removeAttribute('open');
	});
};

const applySettings = (settings) => {
	// Title
	const titleText = settings.title ?? 'API Doc';
	document.title = `${titleText} — API Doc`;
	const h1 = document.querySelector('.header__title');
	if (h1) h1.textContent = titleText;

	// Description
	if (settings.description) {
		const desc = document.querySelector('.header__description');
		if (desc) {
			desc.textContent = settings.description;
			desc.hidden = false;
		}
	}

	// Version badge
	if (settings.version) {
		const versionEl = document.querySelector('.header__version');
		if (versionEl) {
			versionEl.textContent = `v${settings.version}`;
			versionEl.hidden = false;
		}
	}

	// Logo
	if (settings.logo) {
		const logoEl = document.querySelector('.header__logo');
		if (logoEl) {
			logoEl.src = settings.logo;
			logoEl.alt = titleText;
			logoEl.hidden = false;
		}
	}

	// Favicon
	if (settings.favicon) {
		let link = document.querySelector('link[rel="icon"]');
		if (!link) {
			link = document.createElement('link');
			link.rel = 'icon';
			document.head.appendChild(link);
		}
		link.href = settings.favicon;
	}

	// External links
	if (Array.isArray(settings.links) && settings.links.length > 0) {
		const linksEl = document.querySelector('.header__links');
		if (linksEl) {
			settings.links.forEach(({ label, url }) => {
				const a = document.createElement('a');
				a.href = url;
				a.textContent = label;
				a.target = '_blank';
				a.rel = 'noopener noreferrer';
				a.classList.add('header__link');
				linksEl.appendChild(a);
			});
			linksEl.hidden = false;
		}
	}

	// Base URL
	if (settings.baseUrl) apiBaseUrl = settings.baseUrl;

	// Theme (CSS custom properties)
	const cssVars = buildThemeVars(settings.theme);
	const darkCssVars = buildThemeVars(settings.darkTheme);

	if (cssVars.length > 0 || darkCssVars.length > 0) {
		const style = document.createElement('style');
		let css = '';
		if (cssVars.length > 0) css += `:root { ${cssVars.join('; ')}; }\n`;
		if (darkCssVars.length > 0)
			css += `@media (prefers-color-scheme: dark) { :root { ${darkCssVars.join('; ')}; } }\n`;
		style.textContent = css;
		document.head.appendChild(style);
	}
};

const buildThemeVars = (theme) => {
	if (!theme) return [];
	const vars = [];
	const map = {
		accent: '--accent',
		accentLight: '--accent-light',
		accentDark: '--accent-dark',
		colorGet: '--blue',
		colorPost: '--purple',
		colorPut: '--orange',
		colorDelete: '--red',
		fontBody: '--font-body',
		fontMono: '--font-mono',
	};
	for (const [key, cssVar] of Object.entries(map)) {
		if (theme[key]) vars.push(`${cssVar}: ${theme[key]}`);
	}
	return vars;
};

const renderFetchError = (parentNode, message) => {
	parentNode.innerHTML = '';
	const el = document.createElement('p');
	el.classList.add('fetch-error', 'alert', 'alert--danger');
	el.textContent = message;
	parentNode.appendChild(el);
};

const appendFetchedEndpointData = (parentNode, uri, method, opts) => {
	const apiURI = `${apiBaseUrl}${uri}`;

	const fetchOpts = { method };
	if (opts !== undefined) {
		if ('body' in opts) {
			fetchOpts.body = opts.body;
		}
		if ('headers' in opts) {
			fetchOpts.headers = opts.headers;
		}
	}

	parentNode.innerHTML = '';

	fetch(apiURI, fetchOpts)
		.then((r) => {
			if (!r.ok) {
				return r
					.json()
					.catch(() => null)
					.then((body) => {
						const detail = body?.message ?? body?.error ?? r.statusText;
						throw new Error(`${r.status}${detail ? ` — ${detail}` : ''}`);
					});
			}
			return r.json();
		})
		.then((data) => (parentNode.innerHTML = `<pre>${prettyPrintJson.toHtml(data)}</pre>`))
		.catch((err) => {
			const isNetwork = err instanceof TypeError;
			renderFetchError(
				parentNode,
				isNetwork ? `Network error: ${err.message}` : `Error: ${err.message}`
			);
		});
};

const getResponseNode = (response) => {
	const container = document.createElement('details');
	if (response.code === 200 || response.code === 201) {
		container.setAttribute('open', true);
	}
	container.classList.add('response');

	const summary = document.createElement('summary');
	summary.classList.add('response__summary');
	container.appendChild(summary);

	const title = document.createElement('h4');
	title.classList.add('response__title');
	title.innerHTML = `${HTTP_RESPONSE_TITLE[response.code]} <span class="tag">${response.code}</span>`;
	summary.appendChild(title);

	const dataContainer = document.createElement('code');
	dataContainer.classList.add('response__code');
	dataContainer.innerHTML = `<pre>${prettyPrintJson.toHtml(response.response)}</pre>`;
	container.appendChild(dataContainer);

	return container;
};

const getUriParameterId = (parameter) => {
	return `uri-parameter-${parameter.replaceAll(/{|}/g, '')}`;
};

const getQueryParameterId = (parameter) => {
	return `query-parameter-${parameter.replaceAll(/{|}/g, '')}`;
};

const getUriParameterNode = (parameter) => {
	const label = `${parameter.name} <span class="tag">${parameter.parameter}</span> <span class="tag">${parameter.type}</span>`;
	const inputOpts = {
		type: INPUT_TYPE[parameter.type],
		defaultValue: parameter.defaultValue,
		id: getUriParameterId(parameter.parameter),
		required: true,
	};

	return getFormControl(label, inputOpts);
};

const getQueryParameterNode = (parameter) => {
	const label = `${parameter.label}${parameter.type !== 'select' ? `<span class="tag">${parameter.type}</span>` : ''}`;
	const inputOpts = {
		type: INPUT_TYPE[parameter.type],
		defaultValue: parameter.defaultValue,
		id: getQueryParameterId(parameter.name),
		options: parameter.options,
		min: parameter.min,
		max: parameter.max,
	};

	return getFormControl(label, inputOpts);
};

const handleFetch = (
	uri,
	uriParameters,
	method,
	fetchContainer,
	dataContainer,
	queryParameters,
	tokenRequired,
	isMultipart,
	multipartFields
) => {
	let updatedURI = uri;

	if (uriParameters !== undefined && uriParameters.length > 0) {
		uriParameters.forEach((parameter) => {
			const inputId = getUriParameterId(parameter.parameter);
			const input = fetchContainer.querySelector(`#${inputId}`);

			let inputValue;
			if (input.type === 'checkbox' || input.type === 'radio') {
				inputValue = input.checked;
			} else inputValue = input.value;

			const paramRegex = new RegExp(`${parameter.parameter}`);
			updatedURI = updatedURI.replace(paramRegex, inputValue);
		});
	}

	if (queryParameters !== undefined && queryParameters.length > 0) {
		updatedURI += '?';

		queryParameters.forEach((parameter, index) => {
			const inputId = getQueryParameterId(parameter.name);
			const input = fetchContainer.querySelector(`#${inputId}`);

			let inputValue;
			if (input.type === 'checkbox' || input.type === 'radio') {
				inputValue = input.checked;
			} else inputValue = input.value;

			if (
				inputValue !== '' &&
				inputValue !== undefined &&
				inputValue !== null &&
				inputValue !== 'null'
			) {
				updatedURI += `${index !== 0 ? '&' : ''}${parameter.name}=${inputValue}`;
			}
		});
	}

	let body;
	const headers = {};

	if (tokenRequired) {
		headers.Authorization = `Bearer ${token}`;
	}

	if (method === 'POST' || method === 'PUT') {
		if (isMultipart && multipartFields) {
			const formData = new FormData();
			multipartFields.forEach((field) => {
				const el = fetchContainer.querySelector(`#multipart-${field.name}`);
				if (!el) return;
				if (typeof el.getFiles === 'function') {
					el.getFiles().forEach((f) => formData.append(field.name, f));
				} else if (el.type === 'file') {
					if (el.files[0]) formData.append(field.name, el.files[0]);
				} else {
					formData.append(field.name, el.value);
				}
			});
			body = formData;
		} else {
			const textarea = fetchContainer.querySelector('textarea');
			if (textarea) {
				headers['Content-Type'] = 'application/json';
				body = textarea.value || '';
			}
		}
	}

	appendFetchedEndpointData(dataContainer, updatedURI, method, {
		body,
		headers,
	});
};

const getEndpointNode = (endpoint) => {
	const {
		name,
		method,
		uri,
		description,
		tokenRequired,
		responses,
		uriParameters,
		defaultBody,
		body,
		queryParameters,
		multipart,
		multipartFields,
	} = endpoint;

	const container = document.createElement('details');
	container.classList.add('endpoint', `endpoint--${method}`);

	const header = document.createElement('summary');
	header.classList.add('endpoint__header');
	container.appendChild(header);

	const title = document.createElement('h3');
	title.innerHTML = name;
	header.appendChild(title);

	const methodTag = document.createElement('p');
	methodTag.innerHTML = method;
	methodTag.classList.add('tag');
	header.appendChild(methodTag);

	const uriTag = document.createElement('p');
	uriTag.innerHTML = uri;
	uriTag.classList.add('tag');
	header.appendChild(uriTag);

	if (tokenRequired) {
		const requiredTag = document.createElement('p');

		// SVG
		const shieldSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shield-ellipsis-icon lucide-shield-ellipsis"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="M8 12h.01"/><path d="M12 12h.01"/><path d="M16 12h.01"/></svg>`;

		// Required text
		const requiredText = '<span>Required</span>';

		requiredTag.innerHTML = `${shieldSVG}${requiredText}`;
		requiredTag.classList.add('tag');
		header.appendChild(requiredTag);
	}

	const content = document.createElement('div');
	content.classList.add('endpoint__content');
	container.appendChild(content);

	const descriptionNode = document.createElement('p');
	descriptionNode.classList.add('endpoint__description');
	descriptionNode.innerHTML = description;
	content.appendChild(descriptionNode);

	const fetchContainer = document.createElement('form');
	fetchContainer.classList.add('endpoint__fetch-container');
	fetchContainer.addEventListener('submit', (e) => {
		e.preventDefault();
		handleFetch(
			uri,
			uriParameters,
			method,
			fetchContainer,
			dataContainer,
			queryParameters,
			tokenRequired,
			multipart,
			multipartFields
		);
	});
	content.appendChild(fetchContainer);

	if (uriParameters !== undefined && uriParameters.length > 0) {
		const uriParametersContainer = document.createElement('div');
		uriParametersContainer.classList.add('endpoint__uri-parameters-container');
		fetchContainer.appendChild(uriParametersContainer);

		const uriParametersContainerTitle = document.createElement('h4');
		uriParametersContainerTitle.innerHTML = 'URI Parameters';
		uriParametersContainer.appendChild(uriParametersContainerTitle);

		uriParameters.forEach((parameter) => {
			const node = getUriParameterNode(parameter);
			uriParametersContainer.appendChild(node);
		});
	}

	if (queryParameters !== undefined && queryParameters.length > 0) {
		const queryParametersContainer = document.createElement('div');
		queryParametersContainer.classList.add('endpoint__query-parameters-container');
		fetchContainer.appendChild(queryParametersContainer);

		const queryParametersContainerTitle = document.createElement('h4');
		queryParametersContainerTitle.innerHTML = 'Query Parameters';
		queryParametersContainer.appendChild(queryParametersContainerTitle);

		queryParameters.forEach((parameter) => {
			const node = getQueryParameterNode(parameter);
			queryParametersContainer.appendChild(node);
		});
	}

	if (method === 'POST' || method === 'PUT') {
		const fetchBody = document.createElement('div');
		fetchBody.classList.add('endpoint__body-value');
		fetchContainer.appendChild(fetchBody);

		const label = `Body <span class="tag">${multipart ? 'multipart/form-data' : 'application/json'}</span>`;

		if (multipart && multipartFields && multipartFields.length > 0) {
			const labelNode = document.createElement('p');
			labelNode.classList.add('endpoint_body-value__title');
			labelNode.innerHTML = label;
			fetchBody.appendChild(labelNode);

			multipartFields.forEach((field) => {
				const inputOpts = {
					type: INPUT_TYPE[field.type] ?? 'text',
					id: `multipart-${field.name}`,
					required: field.required ?? false,
					accept: field.accept,
					maxWeight: field.maxWeight,
				};
				fetchBody.appendChild(getFormControl(field.label, inputOpts));
			});
		} else if (body != null) {
			const inputOpts = {
				type: 'textarea',
				defaultValue: defaultBody || '{}',
				id: `${name}-body`,
				required: true,
			};
			fetchBody.appendChild(getFormControl(label, inputOpts));
		}
	}

	const fetchButton = document.createElement('button');
	fetchButton.setAttribute('type', 'submit');
	fetchButton.innerHTML = 'Fetch';
	fetchContainer.appendChild(fetchButton);

	const dataContainer = document.createElement('code');
	fetchContainer.appendChild(dataContainer);

	const schemasContainer = document.createElement('div');
	schemasContainer.classList.add('endpoint__schemas');
	content.appendChild(schemasContainer);

	if ((method === 'POST' || method === 'PUT') && (body != null || multipart)) {
		const bodyContainer = document.createElement('div');
		bodyContainer.classList.add('endpoint__body');
		schemasContainer.appendChild(bodyContainer);

		const bodyTitle = document.createElement('h4');
		bodyTitle.classList.add('endpoint__body__title');
		bodyTitle.innerHTML = `Body <span class="tag">${multipart ? 'multipart/form-data' : 'application/json'}</span>`;
		bodyContainer.appendChild(bodyTitle);

		if (multipart && multipartFields && multipartFields.length > 0) {
			const fieldsList = document.createElement('ul');
			fieldsList.classList.add('endpoint__body__schema', 'endpoint__body__schema--multipart');
			multipartFields.forEach((field) => {
				const li = document.createElement('li');
				li.classList.add('endpoint__body__element');
				li.innerHTML = `
	  <code><pre>${field.name}</pre></code>
	  <span class="tag">${field.type}</span>${field.required ? ' <span class="tag">required</span>' : ''}
	  <span>${field.label}</span>`;
				fieldsList.appendChild(li);
			});
			bodyContainer.appendChild(fieldsList);
		} else {
			const bodySchema = document.createElement('code');
			bodySchema.classList.add('endpoint__body__schema');
			bodySchema.innerHTML = `<pre>${prettyPrintJson.toHtml(body)}</pre>`;
			bodyContainer.appendChild(bodySchema);
		}
	}

	const responsesContainer = document.createElement('div');
	responsesContainer.classList.add('endpoint__responses');
	schemasContainer.appendChild(responsesContainer);

	if (responses !== undefined && responses.length > 0) {
		responses.forEach((response) => {
			const node = getResponseNode(response);
			responsesContainer.appendChild(node);
		});
	} else {
		const empty = document.createElement('p');
		empty.innerHTML = 'No responses set yet.';
		responsesContainer.appendChild(empty);
	}

	return container;
};

const getCategoryNode = (category) => {
	const section = document.createElement('section');
	section.classList.add('category');

	const title = document.createElement('h2');
	title.innerHTML = category.name;
	title.classList.add('category__title');
	section.appendChild(title);

	if (category.endpoints.length > 0) {
		category.endpoints.forEach((endpoint) => {
			const endpointNode = getEndpointNode(endpoint);

			section.appendChild(endpointNode);
		});
	} else {
		section.innerHTML += '<p>No endpoints yet.</p>';
	}

	return section;
};

const appendCategories = (parentNode, categories) => {
	categories.forEach((category) => {
		const categoryNode = getCategoryNode(category);

		parentNode.appendChild(categoryNode);
	});
};
