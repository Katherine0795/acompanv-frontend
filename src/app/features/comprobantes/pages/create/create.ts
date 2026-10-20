import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { ComprobanteService } from '../../services/comprobante';
import { PuestosService } from '../../../puestos/services/puestos';
import { DeudasService } from '../../../deudas/services/deudas';
import { AuthService } from '../../../../core/services/auth';
import { Puesto } from '../../../puestos/models/puesto';
import { Deuda } from '../../../deudas/models/deuda';

@Component({
  selector: 'app-comprobante-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './create.html',
  styleUrl: './create.css'
})
export class CreateComponent implements OnInit {

  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private service = inject(ComprobanteService);
  private puestosService = inject(PuestosService);
  private deudasService = inject(DeudasService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  editando = false;
  id: number | null = null;

  puestos: Puesto[] = [];
  deudasPendientes: Deuda[] = [];
  seleccionadas = new Set<number>();

  form = this.fb.group({
    numero: ['', Validators.required],
    fecha: [''],
    tipo: ['BOLETA', Validators.required],
    total: [0, Validators.required],
    vuelto: [0, Validators.required],
    idPuesto: [null as number | null, Validators.required],
    idUsuario: [null as number | null]
  });

  ngOnInit(): void {
    this.puestosService.listar().subscribe({
      next: (data) => {
        this.puestos = data;
        this.cdr.detectChanges();
      }
    });

    this.id = Number(this.route.snapshot.paramMap.get('id'));

    if (this.id) {
      this.editando = true;
      this.cargarComprobante(this.id);
    } else {
      // El comprobante lo registra el usuario que inició sesión
      this.form.patchValue({ idUsuario: this.authService.getUsuario()?.id ?? null });
      this.form.controls.total.disable();
    }
  }

  cargarComprobante(id: number): void {
    this.service.obtenerPorId(id).subscribe({
      next: (data) => {
        this.form.patchValue({
          numero: data.numero,
          fecha: data.fecha?.substring(0,16),
          tipo: data.tipo,
          total: data.total,
          vuelto: data.vuelto,
          idPuesto: data.idPuesto,
          idUsuario: data.idUsuario
        });
        this.cdr.detectChanges();
      }
    });
  }

  // Al elegir el puesto se muestran sus deudas pendientes
  cambiarPuesto(): void {
    this.seleccionadas.clear();
    this.deudasPendientes = [];
    this.actualizarTotal();

    const idPuesto = Number(this.form.value.idPuesto);
    if (!idPuesto || this.editando) return;

    this.deudasService.listar().subscribe({
      next: (data) => {
        this.deudasPendientes = data.filter(
          d => d.estado === 'PENDIENTE' && d.puesto?.id === idPuesto
        );
        this.cdr.detectChanges();
      }
    });
  }

  alternarDeuda(deuda: Deuda): void {
    if (this.seleccionadas.has(deuda.id)) {
      this.seleccionadas.delete(deuda.id);
    } else {
      this.seleccionadas.add(deuda.id);
    }
    this.actualizarTotal();
  }

  actualizarTotal(): void {
    const total = this.deudasPendientes
      .filter(d => this.seleccionadas.has(d.id))
      .reduce((suma, d) => suma + Number(d.monto), 0);
    this.form.controls.total.setValue(Number(total.toFixed(2)));
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.editando && this.seleccionadas.size === 0) {
      Swal.fire('Atención', 'Seleccione al menos una deuda a pagar', 'warning');
      return;
    }

    const valores = this.form.getRawValue();
    const comprobante = {
      ...valores,
      fecha: null,
      listaDetalle: this.editando
        ? []
        : this.deudasPendientes
            .filter(d => this.seleccionadas.has(d.id))
            .map(d => ({ idDeuda: d.id, montoPagado: d.monto }))
    };

    if (this.editando && this.id) {
      this.service.actualizar(this.id, comprobante as any)
        .subscribe({
          next: () => {
            Swal.fire('Actualizado', 'Comprobante actualizado', 'success');
            this.router.navigate(['/comprobantes']);
          },
          error: (e) => {
            Swal.fire('Error', this.mensajeError(e, 'No se pudo actualizar'), 'error');
          }
        });
    } else {
      this.service.registrar(comprobante as any)
        .subscribe({
          next: () => {
            Swal.fire('Registrado', 'Comprobante guardado y deudas marcadas como pagadas', 'success');
            this.router.navigate(['/comprobantes']);
          },
          error: (e) => {
            Swal.fire('Error', this.mensajeError(e, 'No se pudo registrar'), 'error');
          }
        });
    }
  }

  private mensajeError(e: any, porDefecto: string): string {
    if (typeof e?.error === 'string' && e.error) return e.error;
    return e?.error?.message || porDefecto;
  }
}
