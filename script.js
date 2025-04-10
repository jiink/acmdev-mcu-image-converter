document.addEventListener('DOMContentLoaded', () => {
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    const colorSlider = document.getElementById('color-slider');
    const colorValue = document.getElementById('color-value');
    const convertButton = document.getElementById('convert-button');
    const output = document.getElementById('output');
    const downloadButton = document.getElementById('download-button');
    const copyButton = document.getElementById('copy-button');

    colorSlider.addEventListener('input', () => {
        colorValue.textContent = colorSlider.value;
    });

    uploadArea.addEventListener('click', () => fileInput.click());

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragging');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragging');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragging');
        const file = e.dataTransfer.files[0];
        if (file) processImage(file);
    });

    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (file) processImage(file);
    });

    const processImage = (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                // Quantize colors and generate C header file
                const imageData = ctx.getImageData(0, 0, img.width, img.height);
                const { header, palette } = generateCHeader(imageData, img.width, img.height, colorSlider.value, file.name);
                output.value = header;

                downloadButton.onclick = () => downloadFile(file.name, header);
                copyButton.onclick = () => navigator.clipboard.writeText(header);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    };

    const generateCHeader = (imageData, width, height, colors, fileName) => {
        // Simplified quantization and header generation logic
        const sanitizedFileName = fileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_');
        const headerName = sanitizedFileName.toUpperCase();
        const palette = new Map();
        const data = [];

        for (let i = 0; i < imageData.data.length; i += 4) {
            const rgba = (imageData.data[i] << 24) | (imageData.data[i + 1] << 16) | (imageData.data[i + 2] << 8) | imageData.data[i + 3];
            if (!palette.has(rgba)) {
                if (palette.size >= colors) break;
                palette.set(rgba, palette.size);
            }
            data.push(palette.get(rgba));
        }

        const paletteArray = Array.from(palette.keys()).map(color => `0x${(color >>> 0).toString(16).padStart(8, '0')}`);
        const dataArray = data.map((value, index) => (index % width === 0 ? '\n    ' : '') + `0x${value.toString(16).padStart(2, '0')}`);

        const header = `#ifndef ${headerName}_H\n#define ${headerName}_H\n\n` +
            `#include <stdint.h>\n\n` +
            `const uint32_t ${sanitizedFileName}_palette[${palette.size}] = { ${paletteArray.join(', ')} };\n` +
            `const uint8_t ${sanitizedFileName}_data[${width} * ${height}] = {${dataArray.join(', ')}\n};\n` +
            `const uint16_t ${sanitizedFileName}_width = ${width};\n` +
            `const uint16_t ${sanitizedFileName}_height = ${height};\n\n` +
            `#endif // ${headerName}_H\n`;

        return { header, palette: paletteArray };
    };

    const downloadFile = (fileName, content) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
        a.download = fileName.replace(/\.[^/.]+$/, '') + '.h';
        a.click();
    };
});