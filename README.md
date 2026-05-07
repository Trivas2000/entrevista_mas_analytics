# Entrevista_mas_analytics
# Autor Tomás Rivas

Instrucciones para correr:

**Backend**:
```
pip install -r requirements.txt
uvicorn main:app --reload
```

Queda en http://127.0.0.1:8000

**Frontend**:
```
python -m http.server 5500
```
Link http://127.0.0.1:5500


**Decisiones**:

*Realizar una App Web*

Esto ya que no tenemos claridad del perfil del usuario, y una app web es de uso sencillo y relativamente universal, comparado con un script o un producto sin interfaz gráfica.

*Tener backend*

Consideré necesario el backend pensando en la línea donde piden escalabilidad, así podemos asegurar que el sistema funcione con archivos grandes.

*Usar Fast Api para el back*

Es fácil y simple para un ejercicio breve. Además usa Python y quería usar Pandas que es cómodo para procesar CSV.


