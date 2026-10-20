# Diagrama Entidad-Relacion — Stockly

Base de datos PostgreSQL (Supabase) del sistema de inventario multi-negocio.

## Diagrama E-R (notacion Chen / Mermaid)

```mermaid
erDiagram
    CLIENTS ||--o{ PRODUCTS : "tiene (1:N)"

    CLIENTS {
        uuid id PK "Identificador unico"
        text slug UK "atain | sabor | vogue | mara"
        text name "Nombre comercial"
        text business_type "TECNOLOGIA, MODA, etc."
        text description "Descripcion del negocio"
        text icon "Icono en la UI"
        text pin_hash "Clave de acceso (4 digitos)"
        jsonb theme "Colores y tema visual"
        timestamptz created_at "Fecha de creacion"
    }

    PRODUCTS {
        uuid id PK "Identificador unico"
        uuid client_id FK "Negocio al que pertenece"
        text name "Nombre del producto o activo"
        text code "Codigo / serial (unico por negocio)"
        text category "Categoria o tipo de activo"
        numeric price "Precio de venta"
        numeric purchase_price "Precio de compra"
        integer stock "Cantidad en inventario"
        integer min_stock "Umbral de stock bajo"
        text status "En stock, Asignado, Agotado, etc."
        text brand "Marca (ej. Dell, Lenovo)"
        text spot "Ubicacion ATAIN (solo ATAIN)"
        text campaign "Campana ATAIN (ej. BLUELINK)"
        text comments "Notas, hostname, detalle"
        text image_url "URL de imagen"
        timestamptz created_at "Fecha de creacion"
        timestamptz updated_at "Ultima actualizacion"
    }
```

## Relaciones

| Relacion | Cardinalidad | Descripcion |
|----------|--------------|-------------|
| CLIENTS → PRODUCTS | 1 : N | Un negocio (cliente) tiene muchos productos/activos. |
| PRODUCTS → CLIENTS | N : 1 | Cada producto pertenece a un solo negocio. |

## Restricciones importantes

- **PK** `clients.id` — clave primaria UUID.
- **UK** `clients.slug` — identificador del negocio en la app (`atain`, `sabor`, `vogue`, `mara`).
- **PK** `products.id` — clave primaria UUID.
- **FK** `products.client_id` → `clients.id` con `ON DELETE CASCADE`.
- **UK compuesta** `(client_id, code)` — el serial/codigo es unico dentro de cada negocio.

## Indices

| Tabla | Indice | Columnas |
|-------|--------|----------|
| products | products_client_id_idx | client_id |
| products | products_category_idx | category |
| products | products_status_idx | status |
| products | products_campaign_idx | campaign |

## Modelo logico ATAIN (atributos, no tablas separadas)

En ATAIN, cada fila del Excel se expande en varios registros de `products`:

```mermaid
flowchart LR
    subgraph Excel["Fila CSV (1 spot)"]
        S[spot]
        M[modelo + serial]
        P1[pantalla 1]
        P2[pantalla 2]
        H[headset]
        MO[mouse]
        T[teclado]
    end

    subgraph DB["Tabla products"]
        D[Desktop]
        PA1[Pantalla 1]
        PA2[Pantalla 2]
        HE[Headset]
        MU[Mouse]
        TE[Teclado]
    end

    M --> D
    P1 --> PA1
    P2 --> PA2
    H --> HE
    MO --> MU
    T --> TE

    S -.-> D
    S -.-> PA1
    S -.-> PA2
    S -.-> HE
    S -.-> MU
    S -.-> TE
```

| Campo Excel | Registro en products | category |
|-------------|----------------------|----------|
| modelo + serial | Desktop | Desktop |
| pantalla 1 | Pantalla 1 | Pantalla |
| pantalla 2 | Pantalla 2 | Pantalla |
| headset | Headset | Headset |
| mouse | Mouse | Mouse |
| teclado | Teclado | Teclado |

Todos comparten el mismo `spot` y `campaign` del import.

## Entidades de la aplicacion (fuera de Supabase)

Estas existen en el frontend y no tienen tabla propia:

| Entidad | Donde vive | Uso |
|---------|------------|-----|
| Negocio | `businesses.js` + fila en `clients` | Selector inicial, tema, PIN |
| Campana ATAIN | lista en `businesses.js` | Filtro al importar CSV |
| Sesion / PIN | memoria + `clients.pin_hash` | Acceso por negocio |

## Diagrama simplificado (vista de negocio)

```mermaid
erDiagram
    NEGOCIO ||--o{ PRODUCTO : contiene
    NEGOCIO {
        string slug
        string nombre
        string pin
        json tema
    }
    PRODUCTO {
        string codigo_serial
        string nombre
        string categoria_tipo
        string spot
        string campana
        int stock
        string estado
    }
```

## Herramientas para visualizar

- Pegar el bloque `erDiagram` en [Mermaid Live Editor](https://mermaid.live).
- En GitHub, este archivo renderiza el diagrama automaticamente.
- En draw.io: Importar desde SQL usando `database/schema.sql`.
