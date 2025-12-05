import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Database, ref, listVal, objectVal, set } from '@angular/fire/database';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
interface Cobro {
  placa: string;
  costo: number;
  tiempo_seg: number;
  timestamp: number;
}



@Component({
  selector: 'app-parking',
  imports: [CommonModule],
  templateUrl: './parking.html',
  styleUrl: './parking.css',
})
export class Parking {
  private db = inject(Database);

  espacios$: Observable<any[]>;
  historial$: Observable<Cobro[]>;
  espaciosLibres = 0;
  abriendoBarrera = false;
  
  // Pestaña activa por defecto
  activeTab: 'panel' | 'historial' = 'panel';

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

    // 2. Escuchar Historial
    const historialRef = ref(this.db, 'historial_pagos');
    this.historial$ = listVal(historialRef).pipe(
      map((lista: any[]) => lista ? lista.reverse() : [])
    ) as Observable<Cobro[]>;
  }

  ngOnInit() {}

  abrirBarrera() {
    this.abriendoBarrera = true;
    set(ref(this.db, 'control/barrera_abierta'), true);
    setTimeout(() => { this.abriendoBarrera = false; }, 5000);
  }

  esTurnoManana(timestamp: number): boolean {
    const hours = new Date(timestamp * 1000).getHours();
    return hours >= 6 && hours < 18;
  }

  formatDate(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleString('es-PE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  }

  descargarPDF(cobros: Cobro[] | null) {
    if (!cobros || cobros.length === 0) return;
    const doc = new jsPDF();
    doc.text('Reporte Smart Parking', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleString()}`, 14, 28);

    const bodyData = cobros.map(c => [
      c.placa,
      this.formatDate(c.timestamp),
      this.esTurnoManana(c.timestamp) ? 'Mañana' : 'Noche',
      `$ ${c.costo.toFixed(2)}`
    ]);

    autoTable(doc, {
      head: [['Placa', 'Fecha', 'Turno', 'Monto']],
      body: bodyData,
      startY: 35,
    });
    doc.save('Reporte_Parking.pdf');
  }
}
