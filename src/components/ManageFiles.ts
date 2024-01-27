import { randomUUID } from "crypto";
import { readFile, mkdir, rm, unlink } from "node:fs/promises";
import { createWriteStream, mkdirSync } from "node:fs";
import { PDFDocument } from "pdf-lib";


export const notesfolder = "files/notes";
export const archivefolder = "files/archive";
const accepted_types = ["image/png", "image/jpg", "image/jpeg"];

export function initializeFileModule() {
    mkdirSync(notesfolder, { recursive: true });
    mkdirSync(archivefolder, { recursive: true });
}

export async function saveFile(
    TopicId: number,
    filelist: string[],
    downurl: string
): Promise<string | Error> {
    // Looks for Unique name for file
    const filename = randomUUID();
    filelist.forEach((file) => {
        if (file == filename) {
            return saveFile(TopicId, filelist, downurl);
        }
    });

    try {
        const res = await fetch(downurl);
        const contenttype = res.headers.get("content-type");

        if (!contenttype) return new Error(`Unable to get file type.`);
        if (!accepted_types.includes(contenttype))
            return Error("Only PNG and JPG/JPEG type Images are allowed.");
        createWriteStream(
            `${notesfolder}/${TopicId}/${filename}.${contenttype.split("/")[1]}`
        ).write(new Uint8Array(await res.arrayBuffer()));
        return `${filename}.${contenttype.split("/")[1]}`;
    } catch (err) {
        console.error(err);
        return new Error("Unexpected error while saving the file");
    }
}

export async function createArchive(
    id: number,
    images: string[]
): Promise<string | Error> {
    try {
        const pdf = await PDFDocument.create();
        for (let image of images) {
            const bytes = await readFile(`${notesfolder}/${id}/${image}`);

            const pdfImage = image.endsWith("png")
                ? await pdf.embedPng(bytes)
                : await pdf.embedJpg(bytes);

            const page = pdf.addPage([pdfImage.width, pdfImage.height]);
            page.drawImage(pdfImage, {
                width: pdfImage.width,
                height: pdfImage.height,
            });
            continue;
        }
        createWriteStream(`${archivefolder}/${id}.pdf`).write(await pdf.save());
        return `${id}.pdf`;
    } catch (err) {
        console.error(err);
        return new Error("Unexpected error while creating PDF from images.");
    }
}

export async function deletePage(id : number, pageName : string) {
    await unlink(`${notesfolder}/${id}/${pageName}`);
}

export async function deleteTopicFolder(id : number) {
    await rm(`${notesfolder}/${id}`, { recursive: true });
}

export async function createTopicFolder(id : number) {
    await mkdir(`${notesfolder}/${id}`, {recursive : true});
}