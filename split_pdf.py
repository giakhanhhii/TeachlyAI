import pikepdf
import os

input_file = "data_input/BỘ 66 ĐỀ TN THPT 2025 TIẾNG ANH CÓ GIẢI CHI TIẾT.pdf"
output_folder = "output/chunks"
pages_per_file = 100

if not os.path.exists(output_folder):
    os.makedirs(output_folder)

with pikepdf.Pdf.open(input_file) as pdf:
    num_pages = len(pdf.pages)
    for i in range(0, num_pages, pages_per_file):
        new_pdf = pikepdf.Pdf.new()
        end_page = min(i + pages_per_file, num_pages)
        
        # Trích xuất các trang
        for page_num in range(i, end_page):
            new_pdf.pages.append(pdf.pages[page_num])
        
        output_filename = f"{output_folder}/part_{i//pages_per_file + 1}.pdf"
        new_pdf.save(output_filename)
        print(f"Đã lưu: {output_filename}")