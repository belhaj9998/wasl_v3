# API Mappers

Mappers are the boundary between Prisma models and public API responses.

Services own business rules and database operations. Mappers own DTO shape:
field names, serialized decimals/dates, selected relations, and integration-ready
response contracts.

Every API domain should expose response data through a mapper before it reaches
controllers, frontend clients, webhooks, or third-party integrations.
