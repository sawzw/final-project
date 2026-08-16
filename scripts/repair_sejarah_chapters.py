import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CHAPTERS_FILE = ROOT / "sejarahChapters.ts"


def load_chapters():
    source = CHAPTERS_FILE.read_text(encoding="utf-8")
    match = re.search(r"export const textbookChapters = (\[.*\]);\s*$", source, re.S)
    if not match:
        raise RuntimeError("Could not parse sejarahChapters.ts")
    return json.loads(match.group(1))


def make_chinese_notes(chapter):
    keywords = chapter.get("keywords", [])[:7]
    points = chapter.get("importantPoints", [])[:5]
    return [
        {
            "heading": "教材来源",
            "body": [
                f"本章根据 textbooks 文件夹中的 {chapter['form']} Sejarah 课本资料整理。",
                f"主题：第 {chapter['chapterNumber']} 章 - {chapter['title']}。",
                "考试作答时，请保留重要的马来文历史术语。",
            ],
        },
        {
            "heading": "复习重点",
            "body": [
                f"本章重点：{chapter.get('description', chapter['title'])}",
                f"关键词：{', '.join(keywords)}。" if keywords else "复习人物、地点、事件、原因和影响。",
                "如需更完整的中文解释，可在本页使用 Gemini 材料摘要功能。",
            ],
        },
        {
            "heading": "马来文要点",
            "body": points or ["先阅读马来文课本重点，再用自己的话整理原因、影响和历史价值。"],
        },
    ]


def repair_form3_chapter2(chapter):
    chapter["description"] = (
        "Bab ini menerangkan peluasan kuasa British di Pulau Pinang, Singapura dan Melaka, "
        "Perjanjian London 1824, pembentukan Negeri-negeri Selat dan perubahan pentadbirannya."
    )
    chapter["notes"]["Bahasa Melayu"] = [
        {
            "heading": "Sumber buku teks",
            "body": [
                "Berdasarkan Buku Teks Sejarah Tingkatan 3, Bab 2: Pentadbiran Negeri-negeri Selat.",
                "Bab ini bermula dengan kedudukan strategik Pulau Pinang, Singapura dan Melaka yang menarik perhatian British.",
                "Fokus utama ialah peluasan kuasa British, Perjanjian London 1824, pembentukan Negeri-negeri Selat dan pentadbiran British.",
            ],
        },
        {
            "heading": "Peluasan kuasa British",
            "body": [
                "Pulau Pinang penting sebagai pusat pengumpulan barang, pelabuhan persinggahan dan pangkalan tentera British.",
                "British menggunakan tipu helah Francis Light untuk menduduki Pulau Pinang melalui hubungan dengan Kesultanan Kedah.",
                "Singapura dikuasai British kerana kedudukannya strategik di laluan perdagangan Alam Melayu.",
                "Melaka menjadi penting selepas pertikaian British dan Belanda diselesaikan melalui Perjanjian London 1824.",
            ],
        },
        {
            "heading": "Pembentukan dan pentadbiran Negeri-negeri Selat",
            "body": [
                "Pada tahun 1826, Pulau Pinang, Singapura dan Melaka digabungkan sebagai Negeri-negeri Selat.",
                "Penggabungan ini bertujuan menjimatkan perbelanjaan, menyeragamkan pentadbiran dan mengukuhkan penguasaan British di Selat Melaka.",
                "Pada awalnya Negeri-negeri Selat ditadbir di bawah kerajaan British di India.",
                "Pada tahun 1867, pentadbiran dipindahkan ke Pejabat Tanah Jajahan London kerana kelemahan pentadbiran India Office.",
            ],
        },
    ]
    chapter["notes"]["English"] = [
        {
            "heading": "Textbook source",
            "body": [
                "Based on Form 3 Sejarah textbook, Chapter 2: Pentadbiran Negeri-negeri Selat.",
                "The chapter explains how British power expanded in Penang, Singapore and Melaka.",
                "The main focus is British strategy, the Anglo-Dutch Treaty 1824, the formation of the Straits Settlements and administrative change.",
            ],
        },
        {
            "heading": "Main revision points",
            "body": [
                "Penang was useful as a collection centre, stopover port and British military base.",
                "Singapore was important because of its strategic position on the trade route.",
                "The Anglo-Dutch Treaty 1824 divided British and Dutch influence in the Malay world.",
                "Penang, Singapore and Melaka were combined as the Straits Settlements in 1826.",
                "In 1867, administration moved from India to the Colonial Office in London.",
            ],
        },
    ]
    chapter["importantPoints"] = [
        "Pulau Pinang, Singapura dan Melaka dikuasai British melalui strategi yang berbeza.",
        "Pulau Pinang penting sebagai pusat pengumpulan barang, pelabuhan persinggahan dan pangkalan tentera.",
        "Perjanjian London 1824 membahagikan pengaruh British dan Belanda di Alam Melayu.",
        "Negeri-negeri Selat dibentuk pada tahun 1826 untuk menyelaraskan pentadbiran British.",
        "Pada tahun 1867, pentadbiran Negeri-negeri Selat dipindahkan ke Pejabat Tanah Jajahan London.",
        "Pentadbiran British mengubah corak kuasa politik dan ekonomi di Selat Melaka.",
    ]
    chapter["keywords"] = [
        "Pulau Pinang",
        "Singapura",
        "Melaka",
        "Perjanjian London 1824",
        "Negeri-negeri Selat",
        "Pejabat Tanah Jajahan",
    ]


def main():
    chapters = load_chapters()
    for chapter in chapters:
        if chapter["form"] == "Form 3" and chapter["chapterNumber"] == 2:
            repair_form3_chapter2(chapter)
        chapter["notes"]["Chinese"] = make_chinese_notes(chapter)
        chapter["source"] = {"generatedFrom": "textbooks folder and notes/sejarah-tingkatan-1-5-notes.md"}

    body = json.dumps(chapters, ensure_ascii=False, indent=2)
    CHAPTERS_FILE.write_text(
        "// Generated from textbook-based notes and repaired by scripts/repair_sejarah_chapters.py.\n"
        "// Keep summaries concise; do not paste full textbook pages into the app bundle.\n\n"
        f"export const textbookChapters = {body};\n",
        encoding="utf-8",
    )
    print(f"Repaired {len(chapters)} chapters.")


if __name__ == "__main__":
    main()
