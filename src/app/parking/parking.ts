import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // <--- IMPORTANTE PARA LOS FILTROS
import { Database, ref, objectVal, listVal, set } from '@angular/fire/database';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
interface Cobro {
  placa: string;
  costo: number;
  tiempo_seg: number;
  timestamp: number;
}



@Component({
  selector: 'app-parking',
  imports: [CommonModule, FormsModule],
  templateUrl: './parking.html',
  styleUrl: './parking.css',
})
export class Parking {
  private db = inject(Database);

  espacios$: Observable<any[]>;
  
  // Variables para el Historial y Filtros
  historialOriginal: Cobro[] = []; // Datos crudos de Firebase
  historialFiltrado: Cobro[] = []; // Datos filtrados para mostrar
  
  espaciosLibres = 0;
  abriendoBarrera = false;
  activeTab: 'panel' | 'historial' = 'panel';

  // --- VARIABLES DE FILTRO ---
  filterDate: string = ''; // Formato 'YYYY-MM-DD'
  filterShift: 'todos' | 'manana' | 'noche' = 'todos';

  constructor() {
    // 1. Escuchar Espacios
    const espaciosRef = ref(this.db, 'espacios');
    this.espacios$ = objectVal(espaciosRef).pipe(
      map((data: any) => {
        if (!data) return [];
        const lista = Object.keys(data).map(key => ({
          id: key,
          ocupado: data[key].ocupado
        })).sort((a, b) => parseInt(a.id) - parseInt(b.id));
        
        this.espaciosLibres = lista.filter(e => !e.ocupado).length;
        return lista;
      })
    );

    // 2. Escuchar Historial (Suscripción manual para poder filtrar)
    const historialRef = ref(this.db, 'historial_pagos');
    listVal(historialRef).subscribe((data: any[]) => {
      if (data) {
        // Guardamos los datos originales invertidos (más reciente primero)
        this.historialOriginal = (data as Cobro[]).reverse();
        // Aplicamos filtros inmediatamente para mostrar algo
        this.aplicarFiltros();
      }
    });
  }

  ngOnInit() {
    // Inicializar fecha de filtro con el día de hoy (Opcional)
    // const hoy = new Date();
    // this.filterDate = hoy.toISOString().split('T')[0];
  }

  // --- FUNCIÓN DE FILTRADO ---
  aplicarFiltros() {
    this.historialFiltrado = this.historialOriginal.filter(cobro => {
      // 1. Filtro por Fecha
      let coincideFecha = true;
      if (this.filterDate) {
        // Convertir timestamp a YYYY-MM-DD local
        // Nota: Ajustamos a local quitando el offset de zona horaria manualmente o usando strings
        const fechaCobro = new Date(cobro.timestamp * 1000);
        const year = fechaCobro.getFullYear();
        const month =String(fechaCobro.getMonth() + 1).padStart(2, '0');
        const day = String(fechaCobro.getDate()).padStart(2, '0');
        const fechaString = `${year}-${month}-${day}`;
        
        coincideFecha = fechaString === this.filterDate;
      }

      // 2. Filtro por Turno
      let coincideTurno = true;
      if (this.filterShift !== 'todos') {
        const esManana = this.esTurnoManana(cobro.timestamp);
        if (this.filterShift === 'manana') coincideTurno = esManana;
        if (this.filterShift === 'noche') coincideTurno = !esManana;
      }

      return coincideFecha && coincideTurno;
    });
  }

  // --- UTILIDADES ---
  abrirBarrera() {
    this.abriendoBarrera = true;
    set(ref(this.db, 'control/barrera_abierta'), true);
    setTimeout(() => { this.abriendoBarrera = false; }, 5000);
  }

  esTurnoManana(timestamp: number): boolean {
    if (!timestamp) return false;
    const hours = new Date(timestamp * 1000).getHours();
    return hours >= 6 && hours < 18;
  }

  formatDate(timestamp: number): string {
    if (!timestamp) return '-';
    return new Date(timestamp * 1000).toLocaleString('es-PE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  }

  limpiarFiltros() {
    this.filterDate = '';
    this.filterShift = 'todos';
    this.aplicarFiltros();
  }

  // --- PDF ---
  descargarPDF() {
    const datosParaPDF = this.historialFiltrado;
    
    console.log("Exportando PDF...", datosParaPDF.length, "registros");

    if (!datosParaPDF || datosParaPDF.length === 0) {
      alert("No hay datos filtrados para exportar");
      return;
    }

    try {
      const doc = new jsPDF();

      // 1. Calcular el Total
      const totalSuma = datosParaPDF.reduce((acc, curr) => {
        return acc + (Number(curr.costo) || 0);
      }, 0);

      // Encabezado
      doc.setFontSize(18);
      doc.text('Reporte Smart Parking', 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      const fechaTexto = this.filterDate ? `Fecha Filtrada: ${this.filterDate}` : 'Reporte General';
      const turnoTexto = this.filterShift !== 'todos' ? ` | Turno: ${this.filterShift.toUpperCase()}` : '';
      
      doc.text(`Generado: ${new Date().toLocaleString()}`, 14, 28);
      doc.text(`${fechaTexto}${turnoTexto}`, 14, 34);

      // Cuerpo de la tabla
      const bodyData = datosParaPDF.map(c => {
        const placaSegura = c.placa || 'Sin Placa';
        const costoSeguro = Number(c.costo || 0);
        return [
          placaSegura,
          this.formatDate(c.timestamp),
          this.esTurnoManana(c.timestamp) ? 'Mañana' : 'Noche',
          `$ ${costoSeguro.toFixed(2)}`
        ];
      });

      // Generar tabla con Footer
      autoTable(doc, {
        head: [['Placa', 'Fecha', 'Turno', 'Monto']],
        body: bodyData,
        // AQUÍ AGREGAMOS LA FILA DE TOTAL
        foot: [['', '', 'TOTAL INGRESOS', `$ ${totalSuma.toFixed(2)}`]],
        startY: 40,
        theme: 'grid',
        headStyles: { fillColor: [28, 28, 30] },
        footStyles: { 
          fillColor: [28, 28, 30], 
          textColor: [48, 209, 88], // Color Verde Neón para el dinero
          fontStyle: 'bold',
          halign: 'right' // Alinear a la derecha si es posible, o ajustar columnas
        },
        columnStyles: {
          3: { halign: 'right' }, // Alinear columna de monto a la derecha
          2: { halign: 'center' } // Centrar Turno
        }
      });

      doc.save(`Reporte_Parking_${this.filterDate || 'General'}.pdf`);

    } catch (error) {
      console.error("Error PDF:", error);
      alert("Error generando PDF");
    }
  }
}
