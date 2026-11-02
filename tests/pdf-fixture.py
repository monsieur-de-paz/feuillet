"""Valid, reproducible two-page PDF; no external dependency or real user content."""
def pdf_bytes():
    objects=[b'<< /Type /Catalog /Pages 2 0 R >>',b'<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>']
    for index in range(2):
        page=3+index*2;stream=page+1
        objects.append(f'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 7 0 R >> >> /Contents {stream} 0 R >>'.encode())
        commands=f'0.12 0.28 0.24 rg 50 650 495 110 re f BT /F1 26 Tf 1 1 1 rg 75 700 Td (Feuillet - PDF {index+1}/2) Tj ET BT /F1 16 Tf 0 0 0 rg 50 600 Td (Lecture, zoom et navigation fonctionnent.) Tj ET'.encode()
        objects.append(b'<< /Length '+str(len(commands)).encode()+b' >>\nstream\n'+commands+b'\nendstream')
    objects.append(b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
    result=b'%PDF-1.4\n';offsets=[0]
    for i,obj in enumerate(objects,1):offsets.append(len(result));result+=f'{i} 0 obj\n'.encode()+obj+b'\nendobj\n'
    start=len(result);result+=f'xref\n0 {len(objects)+1}\n0000000000 65535 f \n'.encode()
    for offset in offsets[1:]:result+=f'{offset:010d} 00000 n \n'.encode()
    return result+f'trailer\n<< /Size {len(objects)+1} /Root 1 0 R >>\nstartxref\n{start}\n%%EOF\n'.encode()
