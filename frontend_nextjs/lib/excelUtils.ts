import * as XLSX from 'xlsx';

/**
 * Exporte un tableau d'objets vers un fichier Excel (.xlsx)
 * @param data Le tableau de données à exporter
 * @param fileName Le nom du fichier (sans extension)
 */
export function exportToExcel(data: any[], fileName: string) {
    if (!data || data.length === 0) {
        console.warn("Aucune donnée à exporter.");
        return;
    }

    // Création d'une feuille de calcul à partir du JSON
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Création d'un classeur
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Données");

    // Téléchargement du fichier
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
}
