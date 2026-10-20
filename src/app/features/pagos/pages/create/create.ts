import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { PagoService } from '../../services/pago';

@Component({
  selector: 'app-pago-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './create.html',
  styleUrls: ['./create.css']
})
export class CreateComponent {

  private fb = inject(FormBuilder);
  private router = inject(Router);
  private pagoService = inject(PagoService);

  // NUEVO: lista de métodos de pago
  metodosPago = [
    'EFECTIVO',
    'YAPE',
    'PLIN',
    'TRANSFERENCIA'
  ];

  form = this.fb.group({
    metodo: ['', Validators.required],
    montoAcumulado: [0, Validators.required],
    idComprobante1: [null, Validators.required],
    idComprobante2: [null]
  });

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const pago = {
      metodo: this.form.value.metodo!,
      montoAcumulado: this.form.value.montoAcumulado!,
      detalles: [
        {
          idComprobante: this.form.value.idComprobante1
        },
        ...(this.form.value.idComprobante2
          ? [{
              idComprobante:
                this.form.value.idComprobante2
            }]
          : [])
      ]
    };

    this.pagoService.registrar(pago as any).subscribe({
      next: () => {
        Swal.fire(
          'Registrado',
          'Pago registrado correctamente',
          'success'
        );

        this.router.navigate(['/pagos']);
      },
      error: (e) => {
        Swal.fire(
          'Error',
          e?.error?.message || 'No se pudo registrar el pago',
          'error'
        );
      }
    });
  }
}