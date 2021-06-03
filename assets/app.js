// GENERAL TODOS:
//  X  - cut text at the end of terminal
//  X  - make terminal scrollable
//  X     - scroll down automatically
//        - custom scrollbar
//  X  - processing of commands
//  X  - fix space button
//  X  - command history
//     - non-js page
//     - split up code a bit
//     - mobile?
//     - CTRL + C
//  X  - space between > and text while writing...
//  X  - fix cursor blinking messing with scroll
//  X  - block html code etc...
//     - ability to copy & paste
//     - webpack for cross-browser support
//     - documentation

const templates = {
    'empty-input': '<span id="cursor"></span>',
    'empty-terminal': `<div id="input">
                            <i class="fas fa-angle-right prefix-icon"></i>
                            <span id="input-content"><span id="cursor"></span></span>
                       </div>`
};

document.addEventListener('DOMContentLoaded', _ => {
    const commandHistory = [];
    let commandIndex = -1;

    document.addEventListener('keypress', e => {
        if (!inputExists()) return;

        const inputContent = document.getElementById('input-content');
        const char = e.key;

        if (char === 'Enter') return; // Don't allow enter

        scrollDown();

        inputContent.innerHTML = inputContent.innerHTML.replace('<span id="cursor"', char + '<span id="cursor"');
    });

    document.addEventListener('keydown', e => {
        if (!inputExists()) return;

        const inputContent = document.getElementById('input-content');
        const keycode = e.code;

        switch (keycode) {
            case 'Backspace':
                if (checkHTMLEntity('left')) {
                    inputContent.innerHTML = inputContent.innerHTML.replace(/(&(?:[a-z\d]+|#\d+|#x[a-f\d]+);)(?=<span id="cursor")/i, '');
                } else {
                    inputContent.innerHTML = inputContent.innerHTML.replace(/(.?)(?=<span id="cursor")/i, '');
                }
                break;
            case 'Delete':
                if (checkHTMLEntity('right')) {
                    inputContent.innerHTML = inputContent.innerHTML.replace(/(?<=><\/span>)(&(?:[a-z\d]+|#\d+|#x[a-f\d]+);)/i, '');
                } else {
                    inputContent.innerHTML = inputContent.innerHTML.replace(/(?<=><\/span>)(.?)/i, '');
                }
                break;

            case 'Space':
                inputContent.innerHTML = inputContent.innerHTML.replace('<span id="cursor"', '&nbsp;<span id="cursor"');
                break;

            case 'Enter':
            case 'NumpadEnter':
                let input = document.getElementById('input-content').innerText;
                input = stripHTML(input);

                writeLine(input, '<i class="fas fa-angle-right prefix-icon"></i>');
                process(input);
                clearInput();
                break;

            // Arrow keys
            case 'ArrowLeft': // Left arrow
                if (checkHTMLEntity('left')) {
                    inputContent.innerHTML = inputContent.innerHTML.replace(/(&(?:[a-z\d]+|#\d+|#x[a-f\d]+);)(?=<span id="cursor")(<span.*<\/span>)/i, '$2$1');
                } else {
                    inputContent.innerHTML = inputContent.innerHTML.replace(/(.?)(?=<span id="cursor")(<span.*<\/span>)/i, '$2$1');
                }
                break;
            case 'ArrowRight': // Right arrow
                if (checkHTMLEntity('right')) {
                    inputContent.innerHTML = inputContent.innerHTML.replace(/(<span.*<\/span>)(?<=><\/span>)(&(?:[a-z\d]+|#\d+|#x[a-f\d]+);)/i, '$2$1');
                } else {
                    inputContent.innerHTML = inputContent.innerHTML.replace(/(<span.*<\/span>)(?<=><\/span>)(.?)/i, '$2$1');
                }
                break;
            case 'ArrowUp': // Up arrow
                if (commandIndex < commandHistory.length - 1) {
                    commandIndex++;
                    replaceInput(commandHistory[commandIndex] ?? '');
                }
                break;
            case 'ArrowDown': // Down arrow
                if (commandIndex > 0) {
                    commandIndex--;
                    replaceInput(commandHistory[commandIndex] ?? '');
                }
                break;
        }
    });

    /**
     * Check for HTML Entity on the left/right side of cursor.
     *
     * @param {string} direction
     */
    function checkHTMLEntity(direction) {
        const inputContent = document.getElementById('input-content');
        let matches;

        if (direction === 'left') {
            matches = inputContent.innerHTML.match(/(&(?:[a-z\d]+|#\d+|#x[a-f\d]+);)(?=<span id="cursor")/i);
        } else {
            matches = inputContent.innerHTML.match(/(<span.*<\/span>)(?<=><\/span>)(&(?:[a-z\d]+|#\d+|#x[a-f\d]+);)/i);
        }

        return matches !== null;
    }

    /**
     * Remove HTML tags from string.
     *
     * @param {string} html
     */
    function stripHTML(html) {
        html = html.replace(/&(?:[a-z\d]+|#\d+|#x[a-f\d]+);/i, '');
        const doc = new DOMParser().parseFromString(html, 'text/html');

        return doc.body.textContent || "";
    }

    function replaceInput(replacement) {
        const inputContent = document.getElementById('input-content');
        inputContent.innerText = replacement;
        inputContent.innerHTML += '<span id="cursor"></span>';
    }

    function inputExists() {
        return document.getElementById('input') != null;
    }

    function scrollDown() {
        const terminal = document.getElementById('content');
        terminal.scrollTop = terminal.scrollHeight;
    }

    function clearInput() {
        document.getElementById('input-content').innerHTML = '<span id="cursor"></span>';
    }

    function replaceFunctions(text) {
        const result = /<([a-z]+) c=(\d+)>/g.exec(text);
        if (!result) return text;

        for (let i = 0; i < result.length; i += 3) {
            const fullCall = result[i];
            const func = result[i + 1];
            const param = result[i + 2];

            let value = null;
            switch (func) {
                case 'space':
                    value = '&nbsp;'.repeat(param);
                    break;
            }

            if (value === null) continue;

            text = text.replaceAll(fullCall, value);
        }

        return text;
    }

    /**
     * Writes a text into the terminal.
     *
     * @param {string} text
     * @param {string} [prefix='']
     * @param {int} [timeout=0]
     */
    function writeLine(text, prefix, timeout) {
        prefix = prefix || '';
        timeout = timeout || 0;

        text = replaceFunctions(text);

        const div = document.createElement('div');
        div.classList.add('line');
        div.innerHTML = prefix + text;

        if (timeout > 0) {
            setTimeout(_ => {
                document.getElementById('content').insertBefore(div, document.getElementById('input'));
                scrollDown();
            }, timeout);
        } else {
            document.getElementById('content').insertBefore(div, document.getElementById('input'));
            scrollDown();
        }
    }

    function writeLines(...lines) {
        // timeout is used to write messages one by one
        let timeout = 1;
        lines.forEach(line => {
            writeLine(line, '', timeout++ * 50)
        });
    }

    /**
     * Checks if input is a command and runs it if it is.
     *
     * @param {string} input
     */
    function process(input) {
        input = input.trim();
        const args = input.split(' ');

        if (args.length < 1) {
            return;
        }
        const command = args[0];
        args.shift();

        commandHistory.unshift(input);
        commandIndex = -1;

        switch (command) {
            case 'about':
                writeLines(
                    '',
                    'Hi, I\'m Luca!',
                    '',
                    'As you can probably tell, I\'m a web developer.',
                    'I mostly work on the backend side of things, but I sometimes',
                    'find myself messing around with some frontend stuff, too.',
                    '',
                    'Knowledge:',
                    '- PHP 5, PHP 7, PHP 8 (plain, Symfony, Shopware)',
                    '- HTML, CSS (/SASS/LESS/SCSS, Bootstrap), Javascript (/jQuery)',
                    '- VueJS',
                    '- MySQL (with & without Doctrine)',
                    '- Regex',
                    '- Git',
                    '',
                    'If required, I can easily adapt to new languages and/or frameworks.',
                    '',
                );

                replaceInput('about 2');
                break;
            case 'help':
                writeLine('available commands:');
                writeLine('');
                writeLine('about [page] <space c=4> some information about me');
                writeLine('clear <space c=11> clears the terminal');
                break;
            case 'clear':
                loadTemplate(document.getElementById('content'), 'empty-terminal', 'inner');
                break;
            case '':
                break;
            default:
                writeLine('command not found: ' + command);
                break;
        }
    }

    /**
     * Replace data-template elements with their template.
     */
    function loadTemplates() {
        const tplToLoad = document.querySelectorAll('div[data-template]');
        tplToLoad.forEach((div) => {
            const templateName = div.dataset.template

            loadTemplate(div, templateName);
        });
    }

    function loadTemplate(subject, templateName, pos) {
        pos = pos || 'outer';

        if (!templates[templateName]) {
            return;
        }

        const template = templates[templateName];

        switch (pos) {
            case 'inner':
                subject.innerHTML = template;
                break;
            case 'outer':
                subject.outerHTML = template;
                break;
        }
    }

    setTimeout(_ => {
        loadTemplates();
        writeLine('Hello, user.');
    }, 300);

});